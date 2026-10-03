import pytest

from apps.core.testing import assert_other_shop_hidden
from apps.customers.models import Customer
from apps.devices.models import Device
from apps.jobs.models import JobLineItem
from apps.jobs.services import create_job

pytestmark = pytest.mark.django_db


def test_line_items_crud_totals_and_permissions(world, client_for):
    c_owner = client_for(world.owner_a, world.shop_a)
    c_fd = client_for(world.front_desk_a, world.shop_a)

    cust = Customer.objects.create(shop=world.shop_a, name="Aarav Sharma", phone="+919876543201")
    dev = Device.objects.create(shop=world.shop_a, customer=cust, category="mobile", model="Pixel 7")
    job = create_job(
        shop=world.shop_a,
        actor=world.owner_a,
        membership=world.membership_owner_a,
        data={
            "customer": cust,
            "device": dev,
            "fault_description": "Screen display flicker",
            "estimate_paise": 500000,
        },
    )

    # 1. Front desk creates a line item (part with 1.5 quantity)
    r_create = c_fd.post(
        f"/api/v1/jobs/{job.id}/line-items/",
        {
            "kind": "part",
            "description": "OEM AMOLED Display Panel",
            "quantity": "1.500",
            "unit_cost_paise": 200000,
            "unit_price_paise": 300000,
            "discount_paise": 50000,
            "position": 1,
        },
        format="json",
    )
    assert r_create.status_code == 201, r_create.json()
    item1_id = r_create.json()["data"]["id"]
    # line_total = 300000 * 1.5 - 50000 = 450000 - 50000 = 400000
    assert r_create.json()["data"]["line_total_paise"] == 400000

    job.refresh_from_db()
    assert job.total_paise == 400000
    # cost = 200000 * 1.5 = 300000
    assert job.cost_paise == 300000

    # 2. Front Desk retrieves line items: unit_cost_paise must be hidden (no money.see_cost_profit)
    r_fd_list = c_fd.get(f"/api/v1/jobs/{job.id}/line-items/")
    assert r_fd_list.status_code == 200
    items_fd = r_fd_list.json()["data"]
    assert len(items_fd) == 1
    assert "unit_cost_paise" not in items_fd[0]

    # Owner retrieves line items: unit_cost_paise must be visible
    r_owner_list = c_owner.get(f"/api/v1/jobs/{job.id}/line-items/")
    assert r_owner_list.status_code == 200
    items_owner = r_owner_list.json()["data"]
    assert items_owner[0]["unit_cost_paise"] == 200000

    # 3. Add second line item (Labour)
    r_labour = c_fd.post(
        f"/api/v1/jobs/{job.id}/line-items/",
        {
            "kind": "labour",
            "description": "Installation labour",
            "quantity": "1.000",
            "unit_cost_paise": 0,
            "unit_price_paise": 50000,
            "discount_paise": 0,
            "position": 2,
        },
        format="json",
    )
    assert r_labour.status_code == 201
    job.refresh_from_db()
    assert job.total_paise == 450000
    assert job.cost_paise == 300000

    # 4. Patch line item with If-Match
    r_patch = c_fd.patch(
        f"/api/v1/jobs/{job.id}/line-items/{item1_id}/",
        {"discount_paise": 100000},
        format="json",
        HTTP_IF_MATCH="1",
    )
    assert r_patch.status_code == 200
    assert r_patch.json()["data"]["discount_paise"] == 100000
    job.refresh_from_db()
    # 450000 - 100000 + 50000 = 400000
    assert job.total_paise == 400000

    # Patch with concurrency conflict
    r_conflict = c_fd.patch(
        f"/api/v1/jobs/{job.id}/line-items/{item1_id}/",
        {"discount_paise": 100000},
        format="json",
        HTTP_IF_MATCH="1",  # item is now version 2
    )
    assert r_conflict.status_code == 409

    # 5. Discount exceeding gross is rejected (400)
    r_invalid_discount = c_fd.post(
        f"/api/v1/jobs/{job.id}/line-items/",
        {
            "kind": "other",
            "description": "Testing invalid discount",
            "quantity": "1.000",
            "unit_price_paise": 10000,
            "discount_paise": 15000,
        },
        format="json",
    )
    assert r_invalid_discount.status_code == 400

    # 6. Soft delete line item
    r_delete = c_fd.delete(f"/api/v1/jobs/{job.id}/line-items/{item1_id}/")
    assert r_delete.status_code == 204
    job.refresh_from_db()
    # Only labour item remains (50000)
    assert job.total_paise == 50000
    assert job.cost_paise == 0


def test_line_items_locked_and_assignment_permissions(world, client_for):
    c_eng = client_for(world.engineer_a, world.shop_a)
    cust = Customer.objects.create(shop=world.shop_a, name="Kavita", phone="+919876543202")
    dev = Device.objects.create(shop=world.shop_a, customer=cust, category="laptop", model="ThinkPad T14")

    # Unassigned job
    job = create_job(
        shop=world.shop_a,
        actor=world.owner_a,
        membership=world.membership_owner_a,
        data={
            "customer": cust,
            "device": dev,
            "fault_description": "Keyboard keys not registering",
            "estimate_paise": 200000,
        },
    )

    # Engineer cannot edit unassigned job
    r_unassigned = c_eng.post(
        f"/api/v1/jobs/{job.id}/line-items/",
        {"kind": "labour", "description": "Diagnostics", "unit_price_paise": 50000},
        format="json",
    )
    assert r_unassigned.status_code == 403

    # Assign to engineer
    job.assigned_to = world.membership_engineer_a
    job.save(update_fields=["assigned_to"])

    # Engineer can now add line items
    r_assigned = c_eng.post(
        f"/api/v1/jobs/{job.id}/line-items/",
        {"kind": "labour", "description": "Diagnostics", "unit_price_paise": 50000},
        format="json",
    )
    assert r_assigned.status_code == 201

    # Lock job
    job.is_locked = True
    job.save(update_fields=["is_locked"])

    # Modifications rejected when job is locked (409)
    r_locked = c_eng.post(
        f"/api/v1/jobs/{job.id}/line-items/",
        {"kind": "part", "description": "New Keypad", "unit_price_paise": 100000},
        format="json",
    )
    assert r_locked.status_code == 409
    assert r_locked.json()["error"]["code"] == "job.locked"


def test_line_items_tenant_isolation(world, client_for):
    c_owner_b = client_for(world.owner_b, world.shop_b)
    cust_a = Customer.objects.create(shop=world.shop_a, name="Shop A Customer", phone="+919876543203")
    dev_a = Device.objects.create(shop=world.shop_a, customer=cust_a, category="mobile", model="Vivo V27")
    job_a = create_job(
        shop=world.shop_a,
        actor=world.owner_a,
        membership=world.membership_owner_a,
        data={"customer": cust_a, "device": dev_a, "fault_description": "Battery replacement"},
    )

    # Shop B client cannot access Shop A job line items
    r_get = c_owner_b.get(f"/api/v1/jobs/{job_a.id}/line-items/")
    assert r_get.status_code == 404
    r_post = c_owner_b.post(
        f"/api/v1/jobs/{job_a.id}/line-items/",
        {"kind": "part", "description": "Battery", "unit_price_paise": 100000, "quantity": 1},
    )
    assert r_post.status_code == 404

    item_a = JobLineItem.objects.create(
        shop=world.shop_a,
        job=job_a,
        kind="part",
        description="Battery",
        unit_price_paise=100000,
        unit_cost_paise=50000,
        quantity=1,
    )
    assert_other_shop_hidden(
        c_owner_b,
        f"/api/v1/jobs/{job_a.id}/line-items/{item_a.id}/",
        methods=("patch", "delete"),
    )
