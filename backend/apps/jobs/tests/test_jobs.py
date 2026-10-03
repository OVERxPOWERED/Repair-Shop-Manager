import uuid
from concurrent.futures import ThreadPoolExecutor

import pytest
from django.db import connection

from apps.audit.models import AuditLog
from apps.core.testing import assert_other_shop_hidden
from apps.customers.models import Customer
from apps.devices.models import Device
from apps.jobs.models import Job, JobAccessory, JobStatus, JobStatusHistory
from apps.jobs.services import create_job
from apps.tenancy.models import Membership, Role

pytestmark = pytest.mark.django_db


def test_full_create_job(world, client_for):
    c = client_for(world.owner_a, world.shop_a)
    idemp_key = str(uuid.uuid4())

    payload = {
        "new_customer": {
            "name": "Ramesh Kumar",
            "phone": "9876543210",
        },
        "new_device": {
            "category": "mobile",
            "model": "OnePlus 11",
            "identifiers": [{"type": "imei1", "value": "490154203237518"}],
        },
        "fault_description": "Battery draining very fast and heating",
        "accessories": ["Charger", "SIM tray"],
        "lock_type": "pin",
        "lock_value": "1234",
        "estimate_paise": 250000,
        "priority": "urgent",
        "internal_note": "Customer needs it before tomorrow noon",
    }

    r = c.post("/api/v1/jobs/", payload, format="json", HTTP_IDEMPOTENCY_KEY=idemp_key)
    assert r.status_code == 201, r.json()
    data = r.json()["data"]

    # Sequential job numbering starts at 1
    assert data["job_no"] == 1
    assert data["status"] == "received"
    assert data["priority"] == "urgent"
    assert data["has_lock"] is True
    assert "lock_value" not in data  # Never expose raw lock in job representation
    assert len(data["accessories"]) == 2
    assert "Charger" in data["accessories"]

    # Verify DB state
    job = Job.objects.get(id=data["id"])
    assert job.job_no == 1
    assert bytes(job.lock_value_enc) != b"1234"  # Encrypted Fernet ciphertext

    # Status history row
    history = JobStatusHistory.objects.filter(job=job)
    assert history.count() == 1
    assert history.first().from_status == ""
    assert history.first().to_status == "received"

    # Accessories
    assert JobAccessory.objects.filter(job=job).count() == 2

    # Audit log
    audit = AuditLog.objects.filter(action="job.created", entity_id=str(job.id)).first()
    assert audit is not None
    assert audit.after["job_no"] == 1

    # Second job in same shop gets job_no 2
    payload2 = {
        "customer_id": data["customer"]["id"],
        "device_id": data["device"]["id"],
        "fault_description": "Speaker not working",
    }
    r2 = c.post("/api/v1/jobs/", payload2, format="json", HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()))
    assert r2.status_code == 201, r2.json()
    assert r2.json()["data"]["job_no"] == 2


def test_idempotent_create_job(world, client_for):
    c = client_for(world.owner_a, world.shop_a)
    idemp_key = str(uuid.uuid4())

    payload = {
        "new_customer": {"name": "Pooja Sharma", "phone": "9812345678"},
        "new_device": {"category": "mobile", "model": "iPhone 13"},
        "fault_description": "Cracked screen replacement",
    }

    r1 = c.post("/api/v1/jobs/", payload, format="json", HTTP_IDEMPOTENCY_KEY=idemp_key)
    assert r1.status_code == 201, r1.json()
    job_id_1 = r1.json()["data"]["id"]

    r2 = c.post("/api/v1/jobs/", payload, format="json", HTTP_IDEMPOTENCY_KEY=idemp_key)
    assert r2.status_code == 201, r2.json()
    job_id_2 = r2.json()["data"]["id"]

    assert job_id_1 == job_id_2
    assert Job.objects.filter(shop=world.shop_a).count() == 1


@pytest.mark.django_db(transaction=True)
def test_parallel_creates_get_unique_numbers(world):
    cust = Customer.objects.create(shop=world.shop_a, name="Concurrent Customer", phone="+919876543210")
    dev = Device.objects.create(shop=world.shop_a, customer=cust, category="mobile", model="Moto G")
    mem = world.membership(world.owner_a, world.shop_a)

    def one(_):
        try:
            return create_job(
                shop=world.shop_a,
                actor=world.owner_a,
                membership=mem,
                data={"customer": cust, "device": dev, "fault_description": "concurrency test"},
            ).job_no
        finally:
            connection.close()

    with ThreadPoolExecutor(max_workers=10) as pool:
        numbers = list(pool.map(one, range(10)))

    assert sorted(numbers) == list(range(1, 11))


def test_lock_encryption_and_reveal(world, client_for):
    c_owner = client_for(world.owner_a, world.shop_a)
    cust = Customer.objects.create(shop=world.shop_a, name="Lock Test", phone="+919876543210")
    dev = Device.objects.create(shop=world.shop_a, customer=cust, category="mobile", model="Pixel 7")

    job = create_job(
        shop=world.shop_a,
        actor=world.owner_a,
        membership=world.membership(world.owner_a, world.shop_a),
        data={
            "customer": cust,
            "device": dev,
            "fault_description": "Lock check",
            "lock_type": "pattern",
            "lock_value": "1-2-3-6-9",
        },
    )

    # 1. Serializer output does NOT contain lock value
    r_detail = c_owner.get(f"/api/v1/jobs/{job.id}/")
    assert r_detail.status_code == 200
    res = r_detail.json()["data"]
    assert res["has_lock"] is True
    assert "lock_value" not in res

    # 2. Reveal lock as Owner (has jobs.view_device_lock) -> 200 with decrypted value
    r_lock = c_owner.get(f"/api/v1/jobs/{job.id}/lock/")
    assert r_lock.status_code == 200
    assert r_lock.json()["data"] == {"lock_type": "pattern", "lock_value": "1-2-3-6-9"}

    # Audit log recorded
    audit = AuditLog.objects.filter(action="job.lock_viewed", entity_id=str(job.id)).first()
    assert audit is not None
    assert audit.after["lock_type"] == "pattern"

    # 3. User with custom role lacking jobs.view_device_lock -> 403 Forbidden
    restricted_role = Role.objects.create(
        name="NoLockRole",
        permissions=["jobs.view"],
        is_system=False,
    )
    restricted_user = world.engineer_a  # reassign role for test
    mem = Membership.objects.get(user=restricted_user, shop=world.shop_a)
    mem.role = restricted_role
    mem.save(update_fields=["role"])

    c_restricted = client_for(restricted_user, world.shop_a)
    r_forbidden = c_restricted.get(f"/api/v1/jobs/{job.id}/lock/")
    assert r_forbidden.status_code == 403


def test_cost_paise_visibility(world, client_for):
    cust = Customer.objects.create(shop=world.shop_a, name="Cost Test", phone="+919876543210")
    dev = Device.objects.create(shop=world.shop_a, customer=cust, category="mobile", model="iPhone")

    job = create_job(
        shop=world.shop_a,
        actor=world.owner_a,
        membership=world.membership(world.owner_a, world.shop_a),
        data={"customer": cust, "device": dev, "fault_description": "Cost check"},
    )
    job.cost_paise = 450000
    job.total_paise = 900000
    job.save(update_fields=["cost_paise", "total_paise"])

    # Owner has money.see_cost_profit -> cost_paise is visible
    c_owner = client_for(world.owner_a, world.shop_a)
    r_owner = c_owner.get(f"/api/v1/jobs/{job.id}/")
    assert r_owner.status_code == 200
    assert r_owner.json()["data"]["cost_paise"] == 450000

    # Engineer does not have money.see_cost_profit -> cost_paise is absent
    c_eng = client_for(world.engineer_a, world.shop_a)
    r_eng = c_eng.get(f"/api/v1/jobs/{job.id}/")
    assert r_eng.status_code == 200
    assert "cost_paise" not in r_eng.json()["data"]


def test_device_customer_mismatch(world, client_for):
    c = client_for(world.owner_a, world.shop_a)
    cust1 = Customer.objects.create(shop=world.shop_a, name="Customer 1", phone="+919876543211")
    cust2 = Customer.objects.create(shop=world.shop_a, name="Customer 2", phone="+919876543212")
    dev2 = Device.objects.create(shop=world.shop_a, customer=cust2, category="mobile", model="Device 2")

    r = c.post(
        "/api/v1/jobs/",
        {
            "customer_id": str(cust1.id),
            "device_id": str(dev2.id),
            "fault_description": "Mismatch test",
        },
        format="json",
        HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()),
    )
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "job.device_customer_mismatch"


def test_job_update_notes_and_delete(world, client_for):
    c = client_for(world.owner_a, world.shop_a)
    cust = Customer.objects.create(shop=world.shop_a, name="Update Test", phone="+919876543210")
    dev = Device.objects.create(shop=world.shop_a, customer=cust, category="mobile", model="Galaxy")
    job = create_job(
        shop=world.shop_a,
        actor=world.owner_a,
        membership=world.membership(world.owner_a, world.shop_a),
        data={"customer": cust, "device": dev, "fault_description": "Original issue"},
    )

    # 1. Update job with optimistic locking
    r_patch = c.patch(
        f"/api/v1/jobs/{job.id}/",
        {
            "fault_description": "Updated issue",
            "priority": "urgent",
            "lock_type": "pin",
            "lock_value": "9999",
        },
        format="json",
        HTTP_IF_MATCH="1",
    )
    assert r_patch.status_code == 200, r_patch.json()
    assert r_patch.json()["data"]["fault_description"] == "Updated issue"
    assert r_patch.json()["data"]["version"] == 2

    # 2. Notes endpoints
    r_note_post = c.post(
        f"/api/v1/jobs/{job.id}/notes/",
        {"body": "Replaced IC successfully", "visibility": "internal"},
        format="json",
    )
    assert r_note_post.status_code == 201, r_note_post.json()
    assert r_note_post.json()["data"]["body"] == "Replaced IC successfully"

    r_note_get = c.get(f"/api/v1/jobs/{job.id}/notes/")
    assert r_note_get.status_code == 200
    assert len(r_note_get.json()["data"]) == 1

    # 3. Soft delete allowed for status="received"
    r_del = c.delete(f"/api/v1/jobs/{job.id}/")
    assert r_del.status_code == 204
    job.refresh_from_db()
    assert job.deleted_at is not None

    # 4. Cannot delete in-progress job
    job.deleted_at = None
    job.status = JobStatus.IN_REPAIR
    job.save(update_fields=["deleted_at", "status"])

    r_del_conflict = c.delete(f"/api/v1/jobs/{job.id}/")
    assert r_del_conflict.status_code == 409
    assert r_del_conflict.json()["error"]["code"] == "job.cannot_delete_in_progress"


def test_job_tenant_isolation(world, client_for):
    cust = Customer.objects.create(shop=world.shop_a, name="Shop A Cust", phone="+919876543210")
    dev = Device.objects.create(shop=world.shop_a, customer=cust, category="mobile", model="Shop A Dev")
    job = create_job(
        shop=world.shop_a,
        actor=world.owner_a,
        membership=world.membership(world.owner_a, world.shop_a),
        data={"customer": cust, "device": dev, "fault_description": "Shop A only"},
    )

    c_b = client_for(world.owner_b, world.shop_b)
    assert_other_shop_hidden(c_b, f"/api/v1/jobs/{job.id}/")
    assert_other_shop_hidden(c_b, f"/api/v1/jobs/{job.id}/lock/", methods=("get",))
    assert_other_shop_hidden(c_b, f"/api/v1/jobs/{job.id}/notes/", methods=("get",))
