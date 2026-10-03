import uuid

import pytest
from django.utils import timezone

from apps.billing.models import Payment
from apps.billing.payments import job_balance_paise, job_paid_paise
from apps.customers.models import Customer
from apps.devices.models import Device
from apps.jobs.services import create_job

pytestmark = pytest.mark.django_db


def _create_test_job(world, shop, actor, membership, estimate_paise=150000, **kwargs):
    cust = Customer.objects.create(shop=shop, name="Ramesh Kumar", phone="+919876543201")
    dev = Device.objects.create(shop=shop, customer=cust, category="mobile", model="Pixel 7")
    data = {
        "customer": cust,
        "device": dev,
        "fault_description": "Screen replacement",
        "estimate_paise": estimate_paise,
        **kwargs,
    }
    return create_job(shop=shop, actor=actor, membership=membership, data=data)


def test_job_advance_at_intake(world, client_for):
    c_fd = client_for(world.front_desk_a, world.shop_a)
    job = _create_test_job(
        world,
        world.shop_a,
        world.front_desk_a,
        world.membership_front_desk_a,
        estimate_paise=200000,
        advance_paise=50000,
        advance_mode="cash",
        advance_reference="REC-001",
    )

    payments = Payment.objects.filter(job=job, deleted_at__isnull=True)
    assert payments.count() == 1
    adv = payments.first()
    assert adv.amount_paise == 50000
    assert adv.mode == "cash"
    assert adv.direction == Payment.Direction.IN
    assert adv.reference == "REC-001"
    assert "Advance payment at intake" in adv.notes
    assert adv.received_by == world.front_desk_a

    assert job_paid_paise(job) == 50000
    assert job_balance_paise(job) == 150000

    r = c_fd.get(f"/api/v1/jobs/{job.id}/")
    assert r.status_code == 200
    assert r.json()["data"]["paid_paise"] == 50000
    assert r.json()["data"]["balance_paise"] == 150000


def test_record_payment_and_balance_calculation(world, client_for):
    c_fd = client_for(world.front_desk_a, world.shop_a)
    job = _create_test_job(
        world,
        world.shop_a,
        world.front_desk_a,
        world.membership_front_desk_a,
        estimate_paise=150000,
    )

    idemp = str(uuid.uuid4())
    r_pay = c_fd.post(
        f"/api/v1/jobs/{job.id}/payments/",
        {"mode": "upi", "amount_paise": 60000, "reference": "UPI12345678", "notes": "Part payment"},
        HTTP_IDEMPOTENCY_KEY=idemp,
    )
    assert r_pay.status_code == 201
    pay_data = r_pay.json()["data"]
    assert pay_data["amount_paise"] == 60000
    assert pay_data["mode"] == "upi"
    assert pay_data["direction"] == "in"
    assert pay_data["received_by_name"] == world.front_desk_a.name

    r_summary = c_fd.get(f"/api/v1/jobs/{job.id}/payments/")
    assert r_summary.status_code == 200
    summary = r_summary.json()["data"]
    assert summary["paid_paise"] == 60000
    assert summary["balance_paise"] == 90000
    assert len(summary["items"]) == 1


def test_payment_exceeding_balance(world, client_for):
    c_fd = client_for(world.front_desk_a, world.shop_a)
    job = _create_test_job(
        world,
        world.shop_a,
        world.front_desk_a,
        world.membership_front_desk_a,
        estimate_paise=100000,
    )

    r = c_fd.post(
        f"/api/v1/jobs/{job.id}/payments/",
        {"mode": "cash", "amount_paise": 100001},
        HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()),
    )
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "payment.exceeds_balance"


def test_payment_idempotency(world, client_for):
    c_fd = client_for(world.front_desk_a, world.shop_a)
    job = _create_test_job(
        world,
        world.shop_a,
        world.front_desk_a,
        world.membership_front_desk_a,
        estimate_paise=100000,
    )

    idemp = str(uuid.uuid4())
    payload = {"mode": "cash", "amount_paise": 40000}
    r1 = c_fd.post(f"/api/v1/jobs/{job.id}/payments/", payload, HTTP_IDEMPOTENCY_KEY=idemp)
    assert r1.status_code == 201

    r2 = c_fd.post(f"/api/v1/jobs/{job.id}/payments/", payload, HTTP_IDEMPOTENCY_KEY=idemp)
    assert r2.status_code == 201
    assert r2.json()["data"]["id"] == r1.json()["data"]["id"]
    assert Payment.objects.filter(job=job).count() == 1


def test_refund_flow_and_validation(world, client_for):
    c_fd = client_for(world.front_desk_a, world.shop_a)
    c_mgr = client_for(world.manager_a, world.shop_a)

    job = _create_test_job(
        world,
        world.shop_a,
        world.front_desk_a,
        world.membership_front_desk_a,
        estimate_paise=100000,
    )

    # Record initial payment of 80000
    r_pay = c_fd.post(
        f"/api/v1/jobs/{job.id}/payments/",
        {"mode": "upi", "amount_paise": 80000},
        HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()),
    )
    assert r_pay.status_code == 201
    payment_id = r_pay.json()["data"]["id"]

    # Manager issues partial refund of 30000
    idemp_refund = str(uuid.uuid4())
    r_ref = c_mgr.post(
        f"/api/v1/payments/{payment_id}/refund/",
        {"amount_paise": 30000, "reason": "Customer discount after repair"},
        HTTP_IDEMPOTENCY_KEY=idemp_refund,
    )
    assert r_ref.status_code == 201
    ref_data = r_ref.json()["data"]
    assert ref_data["direction"] == "out"
    assert ref_data["amount_paise"] == 30000
    assert ref_data["refunds_payment_id"] == payment_id

    # Verify job paid amount decreased
    assert job_paid_paise(job) == 50000
    assert job_balance_paise(job) == 50000

    # Idempotent replay of refund
    r_ref_retry = c_mgr.post(
        f"/api/v1/payments/{payment_id}/refund/",
        {"amount_paise": 30000, "reason": "Customer discount after repair"},
        HTTP_IDEMPOTENCY_KEY=idemp_refund,
    )
    assert r_ref_retry.status_code == 201
    assert r_ref_retry.json()["data"]["id"] == ref_data["id"]

    # Try to refund more than remaining (remaining is 50000; attempt 60000)
    r_over_refund = c_mgr.post(
        f"/api/v1/payments/{payment_id}/refund/",
        {"amount_paise": 60000, "reason": "Exceeding refund"},
        HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()),
    )
    assert r_over_refund.status_code == 422
    assert r_over_refund.json()["error"]["code"] == "payment.refund_exceeds_paid"

    # Try to refund a refund payment
    refund_id = ref_data["id"]
    r_refund_of_refund = c_mgr.post(
        f"/api/v1/payments/{refund_id}/refund/",
        {"amount_paise": 5000, "reason": "Refund refund"},
        HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()),
    )
    assert r_refund_of_refund.status_code == 422
    assert r_refund_of_refund.json()["error"]["code"] == "payment.cannot_refund_refund"


def test_payment_permissions(world, client_for):
    c_eng = client_for(world.engineer_a, world.shop_a)
    c_fd = client_for(world.front_desk_a, world.shop_a)
    c_mgr = client_for(world.manager_a, world.shop_a)

    job = _create_test_job(
        world,
        world.shop_a,
        world.owner_a,
        world.membership_owner_a,
        estimate_paise=100000,
    )

    # Engineer cannot view payments on job
    r_eng_get = c_eng.get(f"/api/v1/jobs/{job.id}/payments/")
    assert r_eng_get.status_code == 403
    assert r_eng_get.json()["error"]["code"] == "permission.denied"

    # Engineer cannot record payment
    r_eng_post = c_eng.post(
        f"/api/v1/jobs/{job.id}/payments/",
        {"mode": "cash", "amount_paise": 10000},
        HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()),
    )
    assert r_eng_post.status_code == 403
    assert r_eng_post.json()["error"]["code"] == "permission.denied"

    # Front Desk can record payment
    r_fd_post = c_fd.post(
        f"/api/v1/jobs/{job.id}/payments/",
        {"mode": "cash", "amount_paise": 50000},
        HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()),
    )
    assert r_fd_post.status_code == 201
    payment_id = r_fd_post.json()["data"]["id"]

    # Front Desk cannot refund payment
    r_fd_refund = c_fd.post(
        f"/api/v1/payments/{payment_id}/refund/",
        {"amount_paise": 10000, "reason": "Not allowed"},
        HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()),
    )
    assert r_fd_refund.status_code == 403
    assert r_fd_refund.json()["error"]["code"] == "permission.denied"

    # Manager can refund payment
    r_mgr_refund = c_mgr.post(
        f"/api/v1/payments/{payment_id}/refund/",
        {"amount_paise": 10000, "reason": "Manager approved refund"},
        HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()),
    )
    assert r_mgr_refund.status_code == 201


def test_payments_list_and_mode_filtering(world, client_for):
    c_fd = client_for(world.front_desk_a, world.shop_a)
    job = _create_test_job(
        world,
        world.shop_a,
        world.front_desk_a,
        world.membership_front_desk_a,
        estimate_paise=100000,
    )

    c_fd.post(
        f"/api/v1/jobs/{job.id}/payments/",
        {"mode": "cash", "amount_paise": 20000},
        HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()),
    )
    c_fd.post(
        f"/api/v1/jobs/{job.id}/payments/",
        {"mode": "upi", "amount_paise": 30000},
        HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()),
    )

    r_all = c_fd.get("/api/v1/payments/")
    assert r_all.status_code == 200
    assert len(r_all.json()["data"]) == 2

    r_cash = c_fd.get("/api/v1/payments/?mode=cash")
    assert r_cash.status_code == 200
    assert len(r_cash.json()["data"]) == 1
    assert r_cash.json()["data"][0]["mode"] == "cash"

    r_upi = c_fd.get("/api/v1/payments/?mode=upi")
    assert r_upi.status_code == 200
    assert len(r_upi.json()["data"]) == 1
    assert r_upi.json()["data"][0]["mode"] == "upi"


def test_payments_tenant_isolation(world, client_for):
    c_owner_b = client_for(world.owner_b, world.shop_b)
    job_a = _create_test_job(
        world,
        world.shop_a,
        world.owner_a,
        world.membership_owner_a,
        estimate_paise=100000,
    )
    payment_a = Payment.objects.create(
        shop=world.shop_a,
        job=job_a,
        customer=job_a.customer,
        direction=Payment.Direction.IN,
        mode="cash",
        amount_paise=50000,
        received_by=world.owner_a,
        received_at=timezone.now(),
        idempotency_key=uuid.uuid4(),
    )

    # Shop B listing payments sees 0 items
    r_list = c_owner_b.get("/api/v1/payments/")
    assert r_list.status_code == 200
    assert len(r_list.json()["data"]) == 0

    # Shop B cannot refund Shop A's payment
    r_refund = c_owner_b.post(
        f"/api/v1/payments/{payment_a.id}/refund/",
        {"amount_paise": 10000, "reason": "Hacking"},
        HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()),
    )
    assert r_refund.status_code == 404

    # Shop B cannot access Shop A's job payments
    r_job_pay_get = c_owner_b.get(f"/api/v1/jobs/{job_a.id}/payments/")
    assert r_job_pay_get.status_code == 404
    r_job_pay_post = c_owner_b.post(
        f"/api/v1/jobs/{job_a.id}/payments/",
        {"mode": "cash", "amount_paise": 10000},
        HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()),
    )
    assert r_job_pay_post.status_code == 404


def test_dashboard_summary_collected_today(world, client_for):
    c_owner = client_for(world.owner_a, world.shop_a)
    c_eng = client_for(world.engineer_a, world.shop_a)

    job = _create_test_job(
        world,
        world.shop_a,
        world.owner_a,
        world.membership_owner_a,
        estimate_paise=100000,
    )

    # Record 70000 in payment, 20000 refund
    c_owner.post(
        f"/api/v1/jobs/{job.id}/payments/",
        {"mode": "upi", "amount_paise": 70000},
        HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()),
    )
    p = Payment.objects.filter(job=job, direction=Payment.Direction.IN).first()
    c_owner.post(
        f"/api/v1/payments/{p.id}/refund/",
        {"amount_paise": 20000, "reason": "Overcharge refund"},
        HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()),
    )

    # Owner has reports.view_basic -> collected_today_paise = 50000
    r_owner = c_owner.get("/api/v1/dashboard/summary/")
    assert r_owner.status_code == 200
    assert r_owner.json()["data"]["collected_today_paise"] == 50000

    # Engineer lacks reports.view_basic -> collected_today_paise = None
    r_eng = c_eng.get("/api/v1/dashboard/summary/")
    assert r_eng.status_code == 200
    assert r_eng.json()["data"]["collected_today_paise"] is None
