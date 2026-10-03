"""
Comprehensive test suite for invoices, credit notes, sequential numbering,
immutability, tax calculations, snapshots, permissions, and shop scoping.
"""

import threading
from datetime import date
from decimal import Decimal

import pytest
from django.db import connection
from django.utils import timezone

from apps.billing.models import Invoice, Payment
from apps.billing.numbering import next_invoice_number
from apps.billing.services import (
    cancel_invoice,
    create_draft_from_job,
    issue_invoice,
)
from apps.core.api.errors import DomainError
from apps.customers.models import Customer
from apps.devices.models import Device
from apps.jobs.models import Job, JobLineItem
from apps.tenancy.models import Shop

pytestmark = pytest.mark.django_db


def _create_test_job(world, shop, actor, membership, phone=None):
    if phone is None:
        import uuid

        phone = f"+9198{uuid.uuid4().int % 100000000:08d}"
    cust = Customer.objects.create(shop=shop, name="Ramesh Kumar", phone=phone)
    dev = Device.objects.create(shop=shop, customer=cust, category="mobile", model="Pixel 7")
    job_no = Job.objects.filter(shop=shop).count() + 1001
    job = Job.objects.create(
        shop=shop,
        customer=cust,
        device=dev,
        job_no=job_no,
        status="in_repair",
        estimate_paise=500000,
        assigned_to=membership,
        received_at=timezone.now(),
    )
    JobLineItem.objects.create(
        shop=shop,
        job=job,
        kind=JobLineItem.Kind.PART,
        description="Screen Combo OEM",
        quantity=Decimal("1"),
        unit_price_paise=350000,
        unit_cost_paise=200000,
        discount_paise=0,
        tax_rate_bp=1800,
        position=0,
    )
    JobLineItem.objects.create(
        shop=shop,
        job=job,
        kind=JobLineItem.Kind.LABOUR,
        description="Installation Labour",
        quantity=Decimal("1"),
        unit_price_paise=50000,
        unit_cost_paise=0,
        discount_paise=0,
        tax_rate_bp=1800,
        position=1,
    )
    return job


def test_invoice_sequential_numbering(world):
    shop = world.shop_a
    d = date(2026, 5, 15)  # FY 26-27
    s1, n1, disp1 = next_invoice_number(shop, "invoice", d)
    assert n1 == 1
    assert disp1 == f"{shop.invoice_prefix}/26-27/00001"

    s2, n2, disp2 = next_invoice_number(shop, "invoice", d)
    assert n2 == 2
    assert disp2 == f"{shop.invoice_prefix}/26-27/00002"

    # Separate series for credit notes
    scn, ncn, dispcn = next_invoice_number(shop, "credit_note", d)
    assert ncn == 1
    assert dispcn == "CN/26-27/00001"


def test_financial_year_rollover(world):
    shop = world.shop_a
    # March 31, 2027 is in FY 26-27
    d1 = date(2027, 3, 31)
    s1, n1, disp1 = next_invoice_number(shop, "invoice", d1)
    assert disp1.startswith(f"{shop.invoice_prefix}/26-27/")
    assert n1 == 1

    # April 1, 2027 is in FY 27-28; number resets to 1
    d2 = date(2027, 4, 1)
    s2, n2, disp2 = next_invoice_number(shop, "invoice", d2)
    assert disp2.startswith(f"{shop.invoice_prefix}/27-28/")
    assert n2 == 1


@pytest.mark.django_db(transaction=True)
def test_concurrent_numbering_no_gaps(world):
    """
    10 threads concurrently issue numbers for the same series.
    Must produce exactly numbers 1..10 without gaps or collisions.
    """
    shop = world.shop_a
    results = []
    errors = []
    d = date(2026, 6, 1)

    def worker():
        try:
            _, num, _ = next_invoice_number(shop, "invoice", d)
            results.append(num)
        except Exception as e:
            errors.append(e)
        finally:
            connection.close()

    threads = [threading.Thread(target=worker) for _ in range(10)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert not errors, f"Concurrency errors occurred: {errors}"
    assert sorted(results) == list(range(1, 11))


def test_invoice_number_length_validation(world):
    shop = world.shop_a
    shop.invoice_prefix = "TOOLONG"  # 7 chars: TOOLONG/26-27/00001 is 19 chars (>16)
    shop.save(update_fields=["invoice_prefix"])
    with pytest.raises(DomainError) as exc_info:
        next_invoice_number(shop, "invoice", date(2026, 5, 1))
    assert exc_info.value.error_code == "invoice.number_too_long"


def test_invoice_draft_creation_and_gst_calculation(world):
    shop = world.shop_a
    shop.gst_enabled = True
    shop.registration_type = Shop.RegistrationTypeChoices.REGULAR
    shop.state_code = "27"
    shop.gstin = "27AAPFU0939F1ZV"
    shop.save()

    job = _create_test_job(world, shop, world.owner_a, world.membership_owner_a)

    invoice = create_draft_from_job(job, actor=world.owner_a)
    assert invoice.status == Invoice.Status.DRAFT
    assert invoice.kind == Invoice.Kind.TAX_INVOICE
    assert invoice.lines.count() == 2

    # Total = 350,000 + 50,000 = 400,000 paise taxable
    # 18% intra-state: CGST 9% (36,000), SGST 9% (36,000)
    # Total = 472,000 paise
    assert invoice.taxable_paise == 400000
    assert invoice.cgst_paise == 36000
    assert invoice.sgst_paise == 36000
    assert invoice.igst_paise == 0
    assert invoice.total_paise == 472000

    # Cannot create second draft while live one exists
    with pytest.raises(Exception) as exc_info:
        create_draft_from_job(job, actor=world.owner_a)
    assert exc_info.value.error_code == "invoice.already_exists"


def test_invoice_issue_and_immutability(world, client_for):
    shop = world.shop_a
    shop.gst_enabled = False
    shop.save()

    job = _create_test_job(world, shop, world.owner_a, world.membership_owner_a)
    invoice = create_draft_from_job(job, actor=world.owner_a)
    issued = issue_invoice(invoice=invoice, actor=world.owner_a)

    assert issued.status == Invoice.Status.ISSUED
    assert issued.number == 1
    assert issued.number_display.startswith(f"{shop.invoice_prefix}/")
    assert issued.shop_snapshot["name"] == shop.name

    # 1. Direct Python save of protected field must raise RuntimeError
    issued.total_paise = 999999
    with pytest.raises(RuntimeError, match="Issued invoices are immutable"):
        issued.save()

    # 2. Deleting issued invoice must raise RuntimeError
    with pytest.raises(RuntimeError, match="Issued invoices are immutable"):
        issued.delete()

    # 3. Direct modification of line item on issued invoice must raise RuntimeError
    line = issued.lines.first()
    line.description = "Altered description"
    with pytest.raises(RuntimeError, match="Issued invoices are immutable"):
        line.save()

    with pytest.raises(RuntimeError, match="Issued invoices are immutable"):
        line.delete()

    # 4. API PATCH must return 409
    c = client_for(world.owner_a, shop)
    res_patch = c.patch(f"/api/v1/invoices/{issued.id}/", {"notes": "new notes"}, format="json")
    assert res_patch.status_code == 409
    assert res_patch.json()["error"]["code"] == "invoice.already_issued"

    # 5. API DELETE must return 409
    res_del = c.delete(f"/api/v1/invoices/{issued.id}/")
    assert res_del.status_code == 409
    assert res_del.json()["error"]["code"] == "invoice.already_issued"


def test_cancel_invoice_creates_credit_note_and_frees_job(world):
    shop = world.shop_a
    job = _create_test_job(world, shop, world.owner_a, world.membership_owner_a)
    invoice = create_draft_from_job(job, actor=world.owner_a)
    issued = issue_invoice(invoice=invoice, actor=world.owner_a)

    orig, cn = cancel_invoice(invoice=issued, actor=world.owner_a, reason="Customer cancelled repair")

    assert orig.status == Invoice.Status.CANCELLED
    assert orig.cancel_reason == "Customer cancelled repair"
    assert cn.kind == Invoice.Kind.CREDIT_NOTE
    assert cn.status == Invoice.Status.ISSUED
    assert cn.number_display.startswith("CN/")
    assert cn.total_paise == orig.total_paise
    assert cn.lines.count() == orig.lines.count()

    # Original job now has no live invoice, so a new draft can be created
    new_draft = create_draft_from_job(job, actor=world.owner_a)
    assert new_draft.status == Invoice.Status.DRAFT
    assert new_draft.id != orig.id


def test_shop_snapshot_immutability(world):
    shop = world.shop_a
    shop.name = "Original Shop Name"
    shop.phone = "+919876543210"
    shop.save()

    job = _create_test_job(world, shop, world.owner_a, world.membership_owner_a)
    invoice = create_draft_from_job(job, actor=world.owner_a)
    issued = issue_invoice(invoice=invoice, actor=world.owner_a)

    assert issued.shop_snapshot["name"] == "Original Shop Name"

    # Shop updates its details
    shop.name = "New Brand Name"
    shop.phone = "+919999999999"
    shop.save()

    # Invoice snapshot remains frozen
    issued.refresh_from_db()
    assert issued.shop_snapshot["name"] == "Original Shop Name"
    assert issued.shop_snapshot["phone"] == "+919876543210"


def test_invoice_payments_linkage_and_amount_paid(world):
    shop = world.shop_a
    job = _create_test_job(world, shop, world.owner_a, world.membership_owner_a)

    # Pre-invoice advance payment
    p1 = Payment.objects.create(
        shop=shop,
        job=job,
        customer=job.customer,
        direction=Payment.Direction.IN,
        mode="cash",
        amount_paise=100000,
        received_by=world.owner_a,
        received_at=timezone.now(),
        idempotency_key="00000000-0000-0000-0000-000000000001",
    )

    invoice = create_draft_from_job(job, actor=world.owner_a)
    issued = issue_invoice(invoice=invoice, actor=world.owner_a)

    p1.refresh_from_db()
    assert p1.invoice_id == issued.id
    assert issued.amount_paid_paise == 100000
    assert issued.balance_paise == issued.total_paise - 100000

    # Post-invoice payment via record_payment
    from apps.billing.payments import record_payment

    p2 = record_payment(
        shop=shop,
        actor=world.owner_a,
        job=job,
        mode="upi",
        amount_paise=50000,
        reference="UPI12345",
        idempotency_key="00000000-0000-0000-0000-000000000002",
    )

    assert p2.invoice_id == issued.id
    issued.refresh_from_db()
    assert issued.amount_paid_paise == 150000


def test_invoice_permissions_and_scoping(world, client_for):
    shop = world.shop_a
    job = _create_test_job(world, shop, world.owner_a, world.membership_owner_a)

    # 1. Engineer cannot draft invoice
    c_eng = client_for(world.engineer_a, shop)
    res_eng_draft = c_eng.post(f"/api/v1/jobs/{job.id}/invoice/")
    assert res_eng_draft.status_code == 403

    # 2. Front Desk can draft invoice
    c_fd = client_for(world.front_desk_a, shop)
    res_fd_draft = c_fd.post(f"/api/v1/jobs/{job.id}/invoice/")
    assert res_fd_draft.status_code == 201
    invoice_id = res_fd_draft.json()["data"]["id"]

    # 3. Engineer cannot issue invoice
    res_eng_issue = c_eng.post(f"/api/v1/invoices/{invoice_id}/issue/")
    assert res_eng_issue.status_code == 403

    # 4. Front Desk can issue invoice
    res_fd_issue = c_fd.post(f"/api/v1/invoices/{invoice_id}/issue/")
    assert res_fd_issue.status_code == 200

    # 5. Front Desk cannot cancel invoice (requires invoices.cancel, only Manager / Owner)
    res_fd_cancel = c_fd.post(f"/api/v1/invoices/{invoice_id}/cancel/", {"reason": "test"}, format="json")
    assert res_fd_cancel.status_code == 403

    # 6. Owner can cancel invoice
    c_owner = client_for(world.owner_a, shop)
    res_owner_cancel = c_owner.post(f"/api/v1/invoices/{invoice_id}/cancel/", {"reason": "test valid"}, format="json")
    assert res_owner_cancel.status_code == 200

    # 7. Multi-tenant isolation: Shop B accessing Shop A invoice returns 404
    c_shop_b = client_for(world.owner_b, world.shop_b)
    res_cross = c_shop_b.get(f"/api/v1/invoices/{invoice_id}/")
    assert res_cross.status_code == 404


def test_invoice_list_filters(world, client_for):
    shop = world.shop_a
    job1 = _create_test_job(world, shop, world.owner_a, world.membership_owner_a)
    job2 = _create_test_job(world, shop, world.owner_a, world.membership_owner_a)

    inv1 = create_draft_from_job(job1, actor=world.owner_a)
    inv2 = create_draft_from_job(job2, actor=world.owner_a)

    c = client_for(world.owner_a, shop)
    res = c.get(f"/api/v1/invoices/?job_id={job1.id}")
    assert res.status_code == 200
    ids = [i["id"] for i in res.json()["data"]]
    assert str(inv1.id) in ids
    assert str(inv2.id) not in ids
