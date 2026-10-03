import datetime
import uuid

import pytest
from django.utils import timezone

from apps.audit.models import AuditLog
from apps.core.time import IST, today_ist
from apps.customers.models import Customer
from apps.devices.models import Device, DeviceIdentifier
from apps.jobs.models import Job, JobCounter, JobStatus, JobStatusHistory
from apps.jobs.state_machine import TRANSITIONS

pytestmark = pytest.mark.django_db

ALL_STATUSES = list(JobStatus.values)


def make_job(
    world,
    shop=None,
    customer=None,
    device=None,
    status=JobStatus.RECEIVED,
    assigned_to=None,
    is_locked=False,
    received_at=None,
    delivered_at=None,
    warranty_days=30,
):
    shop = shop or world.shop_a
    if not customer:
        phone_suffix = uuid.uuid4().int % 100000000
        customer = Customer.objects.create(shop=shop, name="Test Customer", phone=f"+9198{phone_suffix:08d}")
    if not device:
        device = Device.objects.create(shop=shop, customer=customer, category="mobile", model="Pixel 7")
        DeviceIdentifier.objects.create(shop=shop, device=device, type="imei1", value="356938035643809")
    counter, _ = JobCounter.objects.get_or_create(shop=shop)
    counter.last_job_no += 1
    counter.save()

    job = Job.objects.create(
        shop=shop,
        job_no=counter.last_job_no,
        customer=customer,
        device=device,
        status=status,
        fault_description="Broken screen",
        received_at=received_at or timezone.now(),
        delivered_at=delivered_at,
        assigned_to=assigned_to,
        is_locked=is_locked,
        warranty_days=warranty_days,
        created_by=world.owner_a,
    )
    return job


# 1. Test every (from_status, to_status) transition pair
ALL_PAIRS = [(f, t) for f in ALL_STATUSES for t in ALL_STATUSES]


@pytest.mark.parametrize("from_status,to_status", ALL_PAIRS)
def test_all_transition_pairs(world, client_for, from_status, to_status):
    c = client_for(world.owner_a, world.shop_a)
    job = make_job(world, status=from_status)

    payload = {
        "to_status": to_status,
        "note": f"Testing transition {from_status} -> {to_status}",
        "cancel_reason": "Customer cancelled repair" if to_status == JobStatus.CANCELLED else "",
    }

    r = c.post(
        f"/api/v1/jobs/{job.id}/status/",
        payload,
        format="json",
        HTTP_IF_MATCH=str(job.version),
    )

    allowed_set = TRANSITIONS.get(from_status, set())
    if to_status in allowed_set:
        assert r.status_code == 200, f"Expected 200 for {from_status} -> {to_status}, got {r.status_code}: {r.json()}"
        job.refresh_from_db()
        assert job.status == to_status
    else:
        assert r.status_code == 409, f"Expected 409 for {from_status} -> {to_status}, got {r.status_code}: {r.json()}"
        assert r.json()["error"]["code"] == "job.invalid_transition"


def test_deliver_permission_and_side_effects(world, client_for):
    eng_client = client_for(world.engineer_a, world.shop_a)
    owner_client = client_for(world.owner_a, world.shop_a)

    eng_membership = world.membership(world.engineer_a, world.shop_a)
    job = make_job(world, status=JobStatus.READY_FOR_PICKUP, assigned_to=eng_membership)

    # Engineer lacks jobs.deliver -> 403
    r = eng_client.post(
        f"/api/v1/jobs/{job.id}/status/",
        {"to_status": "delivered"},
        format="json",
        HTTP_IF_MATCH=str(job.version),
    )
    assert r.status_code == 403
    assert r.json()["error"]["code"] == "permission.denied"

    # Owner delivers with lock_order_after_delivery = False
    world.shop_a.lock_order_after_delivery = False
    world.shop_a.save()

    r = owner_client.post(
        f"/api/v1/jobs/{job.id}/status/",
        {"to_status": "delivered"},
        format="json",
        HTTP_IF_MATCH=str(job.version),
    )
    assert r.status_code == 200, r.json()
    job.refresh_from_db()
    assert job.status == JobStatus.DELIVERED
    assert job.delivered_at is not None
    assert job.delivered_by == world.owner_a
    assert job.warranty_until == today_ist() + datetime.timedelta(days=30)
    assert job.is_locked is False

    # Now test with lock_order_after_delivery = True
    world.shop_a.lock_order_after_delivery = True
    world.shop_a.save()

    job2 = make_job(world, status=JobStatus.READY_FOR_PICKUP)
    r2 = owner_client.post(
        f"/api/v1/jobs/{job2.id}/status/",
        {"to_status": "delivered"},
        format="json",
        HTTP_IF_MATCH=str(job2.version),
    )
    assert r2.status_code == 200
    job2.refresh_from_db()
    assert job2.is_locked is True


def test_locked_job_status_change_and_reopen(world, client_for):
    c = client_for(world.owner_a, world.shop_a)
    job = make_job(world, status=JobStatus.DELIVERED, is_locked=True)

    # Status change on locked job -> 409
    r = c.post(
        f"/api/v1/jobs/{job.id}/status/",
        {"to_status": "in_repair"},
        format="json",
        HTTP_IF_MATCH=str(job.version),
    )
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "job.locked"

    # Reopen on locked job -> 409
    r_reopen = c.post(f"/api/v1/jobs/{job.id}/reopen/", {"reason": "Customer complaint"}, format="json")
    assert r_reopen.status_code == 409
    assert r_reopen.json()["error"]["code"] == "job.locked"


def test_reopen_unlocked_terminal_job(world, client_for):
    eng_client = client_for(world.engineer_a, world.shop_a)
    owner_client = client_for(world.owner_a, world.shop_a)

    job = make_job(world, status=JobStatus.DELIVERED, is_locked=False)

    # Engineer lacks jobs.reopen -> 403
    r = eng_client.post(f"/api/v1/jobs/{job.id}/reopen/", {"reason": "Test reopen"}, format="json")
    assert r.status_code == 403
    assert r.json()["error"]["code"] == "permission.denied"

    # Missing reason -> 400
    r_empty = owner_client.post(f"/api/v1/jobs/{job.id}/reopen/", {"reason": "  "}, format="json")
    assert r_empty.status_code == 400

    # Owner reopens -> 200, status is in_repair, warranty cleared
    r_success = owner_client.post(f"/api/v1/jobs/{job.id}/reopen/", {"reason": "Screen flickering"}, format="json")
    assert r_success.status_code == 200, r_success.json()

    job.refresh_from_db()
    assert job.status == JobStatus.IN_REPAIR
    assert job.warranty_until is None

    # History entry written
    hist = JobStatusHistory.objects.filter(job=job).last()
    assert hist.from_status == JobStatus.DELIVERED
    assert hist.to_status == JobStatus.IN_REPAIR
    assert hist.note == "Screen flickering"

    # Audit entry written
    audit = AuditLog.objects.filter(shop=world.shop_a, action="job.reopened", entity_id=str(job.id)).first()
    assert audit is not None
    assert audit.after["reason"] == "Screen flickering"


def test_status_transition_history_and_audit(world, client_for):
    c = client_for(world.owner_a, world.shop_a)
    job = make_job(world, status=JobStatus.RECEIVED)

    r = c.post(
        f"/api/v1/jobs/{job.id}/status/",
        {"to_status": "diagnosing", "note": "Opened device to inspect motherboard"},
        format="json",
        HTTP_IF_MATCH=str(job.version),
    )
    assert r.status_code == 200

    # Status history entry
    hist = JobStatusHistory.objects.filter(job=job).last()
    assert hist.from_status == JobStatus.RECEIVED
    assert hist.to_status == JobStatus.DIAGNOSING
    assert hist.note == "Opened device to inspect motherboard"
    assert hist.changed_by == world.owner_a

    # Audit log
    audit = AuditLog.objects.filter(shop=world.shop_a, action="job.status_changed", entity_id=str(job.id)).first()
    assert audit is not None
    assert audit.before["status"] == JobStatus.RECEIVED
    assert audit.after["status"] == JobStatus.DIAGNOSING


def test_engineer_visibility_and_assignment_restrictions(world, client_for):
    eng_client = client_for(world.engineer_a, world.shop_a)
    eng_membership = world.membership(world.engineer_a, world.shop_a)

    job_assigned = make_job(world, status=JobStatus.RECEIVED, assigned_to=eng_membership)
    job_unassigned = make_job(world, status=JobStatus.RECEIVED, assigned_to=None)

    # 1. When engineers_see_assigned_only = False
    world.shop_a.engineers_see_assigned_only = False
    world.shop_a.save()

    r = eng_client.get("/api/v1/jobs/")
    assert r.status_code == 200
    ids = [j["id"] for j in r.json()["data"]]
    assert str(job_assigned.id) in ids
    assert str(job_unassigned.id) in ids

    # Retrieve other job -> 200
    r_get = eng_client.get(f"/api/v1/jobs/{job_unassigned.id}/")
    assert r_get.status_code == 200

    # 2. Engineer cannot change status of unassigned job -> 403 job.not_assigned_to_you
    r_status = eng_client.post(
        f"/api/v1/jobs/{job_unassigned.id}/status/",
        {"to_status": "diagnosing"},
        format="json",
        HTTP_IF_MATCH=str(job_unassigned.version),
    )
    assert r_status.status_code == 403
    assert r_status.json()["error"]["code"] == "job.not_assigned_to_you"

    # 3. When engineers_see_assigned_only = True
    world.shop_a.engineers_see_assigned_only = True
    world.shop_a.save()

    r_scoped = eng_client.get("/api/v1/jobs/")
    scoped_ids = [j["id"] for j in r_scoped.json()["data"]]
    assert str(job_assigned.id) in scoped_ids
    assert str(job_unassigned.id) not in scoped_ids

    # Unassigned job retrieves as 404
    r_unassigned_get = eng_client.get(f"/api/v1/jobs/{job_unassigned.id}/")
    assert r_unassigned_get.status_code == 404


def test_allowed_transitions_endpoint(world, client_for):
    owner_client = client_for(world.owner_a, world.shop_a)
    eng_client = client_for(world.engineer_a, world.shop_a)
    eng_membership = world.membership(world.engineer_a, world.shop_a)

    job_received = make_job(world, status=JobStatus.RECEIVED)
    r = owner_client.get(f"/api/v1/jobs/{job_received.id}/transitions/")
    assert r.status_code == 200
    allowed = r.json()["data"]["allowed"]
    assert set(allowed) == {"diagnosing", "awaiting_approval", "in_repair", "cancelled"}

    # On ready_for_pickup, Owner sees delivered and in_repair, Engineer sees only in_repair (lacks jobs.deliver)
    job_ready = make_job(world, status=JobStatus.READY_FOR_PICKUP, assigned_to=eng_membership)
    r_owner = owner_client.get(f"/api/v1/jobs/{job_ready.id}/transitions/")
    assert set(r_owner.json()["data"]["allowed"]) == {"delivered", "in_repair"}

    r_eng = eng_client.get(f"/api/v1/jobs/{job_ready.id}/transitions/")
    assert set(r_eng.json()["data"]["allowed"]) == {"in_repair"}


def test_assign_technician_endpoint(world, client_for):
    fd_client = client_for(world.front_desk_a, world.shop_a)
    eng_client = client_for(world.engineer_a, world.shop_a)
    eng_membership = world.membership(world.engineer_a, world.shop_a)

    job = make_job(world, status=JobStatus.RECEIVED, assigned_to=None)

    # Front Desk assigns job to Engineer -> 200
    r = fd_client.post(f"/api/v1/jobs/{job.id}/assign/", {"membership_id": str(eng_membership.id)}, format="json")
    assert r.status_code == 200
    job.refresh_from_db()
    assert job.assigned_to == eng_membership

    # Front Desk unassigns -> 200
    r_unassign = fd_client.post(f"/api/v1/jobs/{job.id}/assign/", {"membership_id": None}, format="json")
    assert r_unassign.status_code == 200
    job.refresh_from_db()
    assert job.assigned_to is None

    # Invalid membership id -> 400
    r_invalid = fd_client.post(f"/api/v1/jobs/{job.id}/assign/", {"membership_id": str(uuid.uuid4())}, format="json")
    assert r_invalid.status_code == 400
    assert r_invalid.json()["error"]["code"] == "job.invalid_assignee"

    # Engineer lacks jobs.assign -> 403
    r_eng = eng_client.post(f"/api/v1/jobs/{job.id}/assign/", {"membership_id": str(eng_membership.id)}, format="json")
    assert r_eng.status_code == 403


def test_counts_and_dashboard_summary_with_ist_boundaries(world, client_for):
    c = client_for(world.owner_a, world.shop_a)
    today = today_ist()

    # Time helpers for IST
    yesterday_2359_ist = datetime.datetime.combine(
        today - datetime.timedelta(days=1), datetime.time(23, 59, 0), tzinfo=IST
    ).astimezone(datetime.UTC)
    today_1000_ist = datetime.datetime.combine(today, datetime.time(10, 0, 0), tzinfo=IST).astimezone(datetime.UTC)

    # Clear previous jobs in shop_a
    Job.objects.filter(shop=world.shop_a).delete()

    # Create known jobs
    make_job(world, status=JobStatus.RECEIVED, received_at=today_1000_ist)  # pending, received_today
    make_job(world, status=JobStatus.DIAGNOSING, received_at=today_1000_ist)  # in_progress, received_today
    make_job(world, status=JobStatus.IN_REPAIR, received_at=yesterday_2359_ist)  # in_progress, NOT received_today
    make_job(world, status=JobStatus.REPAIRED, received_at=yesterday_2359_ist)  # repaired, NOT received_today
    make_job(
        world, status=JobStatus.DELIVERED, received_at=yesterday_2359_ist, delivered_at=today_1000_ist
    )  # delivered, delivered_today
    make_job(
        world, status=JobStatus.DELIVERED, received_at=yesterday_2359_ist, delivered_at=yesterday_2359_ist
    )  # delivered, NOT delivered_today
    make_job(world, status=JobStatus.CANCELLED, received_at=yesterday_2359_ist)  # closed

    # 1. Test /jobs/counts/
    r_counts = c.get("/api/v1/jobs/counts/")
    assert r_counts.status_code == 200
    counts = r_counts.json()["data"]
    assert counts == {
        "all": 7,
        "pending": 1,
        "in_progress": 2,
        "repaired": 1,
        "delivered": 2,
        "closed": 1,
    }

    # 2. Test /dashboard/summary/ for today
    r_summary = c.get(f"/api/v1/dashboard/summary/?date={today.isoformat()}")
    assert r_summary.status_code == 200
    summary = r_summary.json()["data"]
    assert summary == {
        "received_today": 2,
        "pending": 1,
        "in_progress": 2,
        "repaired": 1,
        "delivered_today": 1,
    }


def test_jobs_q_search_and_filters(world, client_for):
    c = client_for(world.owner_a, world.shop_a)
    Job.objects.filter(shop=world.shop_a).delete()

    cust1 = Customer.objects.create(shop=world.shop_a, name="Aarav Sharma", phone="+919876543210")
    dev1 = Device.objects.create(shop=world.shop_a, customer=cust1, category="mobile", model="Galaxy S23")
    DeviceIdentifier.objects.create(shop=world.shop_a, device=dev1, type="imei1", value="356938035643809")

    cust2 = Customer.objects.create(shop=world.shop_a, name="Priya Patel", phone="+919123456789")
    dev2 = Device.objects.create(shop=world.shop_a, customer=cust2, category="laptop", model="MacBook Pro")

    job1 = Job.objects.create(
        shop=world.shop_a,
        job_no=42,
        customer=cust1,
        device=dev1,
        status=JobStatus.IN_REPAIR,
        fault_description="Screen replacement",
        received_at=timezone.now(),
        created_by=world.owner_a,
    )

    job2 = Job.objects.create(
        shop=world.shop_a,
        job_no=99,
        customer=cust2,
        device=dev2,
        status=JobStatus.RECEIVED,
        fault_description="Water damage keyboard",
        received_at=timezone.now(),
        created_by=world.owner_a,
    )

    # 1. Exact job number search (?q=42)
    r = c.get("/api/v1/jobs/?q=42")
    items = r.json()["data"]
    assert len(items) == 1
    assert items[0]["id"] == str(job1.id)

    # 2. Phone suffix search (?q=3210)
    r = c.get("/api/v1/jobs/?q=3210")
    items = r.json()["data"]
    assert len(items) == 1
    assert items[0]["id"] == str(job1.id)

    # 3. IMEI suffix search (?q=3809)
    r = c.get("/api/v1/jobs/?q=3809")
    items = r.json()["data"]
    assert len(items) == 1
    assert items[0]["id"] == str(job1.id)

    # 4. Customer name search (?q=Aarav)
    r = c.get("/api/v1/jobs/?q=Aarav")
    items = r.json()["data"]
    assert len(items) == 1
    assert items[0]["id"] == str(job1.id)

    # 5. Device model search (?q=MacBook)
    r = c.get("/api/v1/jobs/?q=MacBook")
    items = r.json()["data"]
    assert len(items) == 1
    assert items[0]["id"] == str(job2.id)

    # 6. Filter by group (?group=in_progress)
    r = c.get("/api/v1/jobs/?group=in_progress")
    items = r.json()["data"]
    assert len(items) == 1
    assert items[0]["id"] == str(job1.id)
