import io
from datetime import datetime, timedelta

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from apps.audit.models import AuditLog
from apps.billing.models import Invoice, Payment
from apps.core.time import IST
from apps.customers.models import Customer
from apps.devices.models import Device
from apps.jobs.models import Job, JobStatus
from apps.tenancy.models import Shop

pytestmark = pytest.mark.django_db


def make_test_image(format="PNG", size=(600, 600), color=(255, 0, 0, 255)) -> bytes:
    buf = io.BytesIO()
    mode = "RGBA" if format.upper() == "PNG" else "RGB"
    img = Image.new(mode, size, color=color if mode == "RGBA" else (255, 0, 0))
    img.save(buf, format=format)
    return buf.getvalue()


def test_shop_logo_upload_and_permissions(world, client_for):
    """POST /shops/current/logo/ allows PNG/JPEG, resizes to <=512px, sets logo_key, audited."""
    owner_client = client_for(world.owner_a, world.shop_a)
    front_desk_client = client_for(world.front_desk_a, world.shop_a)

    png_bytes = make_test_image(format="PNG", size=(800, 800))
    upload_file = SimpleUploadedFile("logo.png", png_bytes, content_type="image/png")

    # Front Desk lacks shop.settings -> 403
    r = front_desk_client.post("/api/v1/shops/current/logo/", {"file": upload_file}, format="multipart")
    assert r.status_code == 403

    # Owner has shop.settings -> 200
    upload_file.seek(0)
    r = owner_client.post("/api/v1/shops/current/logo/", {"file": upload_file}, format="multipart")
    assert r.status_code == 200
    data = r.json()["data"]

    # Verify response contains logo_url
    assert data["logo_url"] is not None
    assert "shops/" in data["logo_url"]

    # Verify DB state
    shop = Shop.objects.get(id=world.shop_a.id)
    assert shop.logo_key is not None
    assert shop.logo_key.startswith(f"shops/{shop.id}/logo.")

    # Verify audit log
    audit = AuditLog.objects.filter(action="shop.logo_updated", entity_id=str(shop.id)).first()
    assert audit is not None


def test_shop_settings_default_terms(world, client_for):
    """PATCH /shops/current/ updates default_terms and tracks version."""
    owner_client = client_for(world.owner_a, world.shop_a)

    shop = Shop.objects.get(id=world.shop_a.id)
    v1 = shop.version

    terms_text = "1. 30 days warranty on display replacement.\n2. Water damage void warranty."
    r = owner_client.patch(
        "/api/v1/shops/current/",
        {"default_terms": terms_text},
        format="json",
        HTTP_IF_MATCH=str(v1),
    )
    assert r.status_code == 200
    data = r.json()["data"]
    assert data["default_terms"] == terms_text
    assert data["version"] == v1 + 1


def test_reports_summary_and_permissions(world, client_for):
    """GET /reports/summary/ computes correct job, collection, and revenue totals with role gating."""
    owner_client = client_for(world.owner_a, world.shop_a)
    front_desk_client = client_for(world.front_desk_a, world.shop_a)
    engineer_client = client_for(world.engineer_a, world.shop_a)

    # Base test date in IST: 2026-10-10
    test_date_str = "2026-10-10"
    base_ist = datetime(2026, 10, 10, 14, 30, tzinfo=IST)

    # 1. Create Customer & Device
    cust = Customer.objects.create(shop=world.shop_a, name="Report Cust", phone="9876543210")
    dev = Device.objects.create(shop=world.shop_a, customer=cust, category="mobile", brand_text="Apple", model="iPhone")

    # 2. Create Jobs:
    # - Job 1: received and delivered on test date with total 2000 Rs (200000 paise), cost 800 Rs (80000 paise)
    job1 = Job.objects.create(
        shop=world.shop_a,
        job_no=501,
        customer=cust,
        device=dev,
        status=JobStatus.DELIVERED,
        fault_description="Screen repair",
        total_paise=200000,
        cost_paise=80000,
        received_at=base_ist,
        delivered_at=base_ist + timedelta(hours=2),
    )
    # - Job 2: received on test date, still diagnosing
    Job.objects.create(
        shop=world.shop_a,
        job_no=502,
        customer=cust,
        device=dev,
        status=JobStatus.DIAGNOSING,
        fault_description="Battery issue",
        total_paise=100000,
        cost_paise=30000,
        received_at=base_ist,
    )

    # 3. Create Payments:
    # - UPI payment IN of 1500 Rs (150000 paise)
    import uuid

    Payment.objects.create(
        shop=world.shop_a,
        customer=cust,
        job=job1,
        amount_paise=150000,
        mode="upi",
        direction="in",
        received_by=world.owner_a,
        received_at=base_ist,
        idempotency_key=uuid.uuid4(),
    )
    # - Cash payment IN of 500 Rs (50000 paise)
    Payment.objects.create(
        shop=world.shop_a,
        customer=cust,
        job=job1,
        amount_paise=50000,
        mode="cash",
        direction="in",
        received_by=world.owner_a,
        received_at=base_ist,
        idempotency_key=uuid.uuid4(),
    )
    # - Refund payment OUT of 200 Rs (20000 paise)
    Payment.objects.create(
        shop=world.shop_a,
        customer=cust,
        job=job1,
        amount_paise=20000,
        mode="cash",
        direction="out",
        received_by=world.owner_a,
        received_at=base_ist,
        idempotency_key=uuid.uuid4(),
    )

    # 4. Create Invoices:
    # - Tax invoice issued for 2000 Rs (200000 paise)
    Invoice.objects.create(
        shop=world.shop_a,
        customer=cust,
        job=job1,
        kind=Invoice.Kind.TAX_INVOICE,
        status=Invoice.Status.ISSUED,
        number_display="INV-501",
        issue_date=base_ist.date(),
        subtotal_paise=200000,
        taxable_paise=200000,
        total_paise=200000,
    )
    # - Credit note issued for 200 Rs (20000 paise)
    Invoice.objects.create(
        shop=world.shop_a,
        customer=cust,
        job=job1,
        kind=Invoice.Kind.CREDIT_NOTE,
        status=Invoice.Status.ISSUED,
        number_display="CN-501",
        issue_date=base_ist.date(),
        subtotal_paise=20000,
        taxable_paise=20000,
        total_paise=20000,
    )

    # --- Role & Permission Tests ---
    # Engineer lacks reports.view_basic -> 403
    r = engineer_client.get(f"/api/v1/reports/summary/?from={test_date_str}&to={test_date_str}")
    assert r.status_code == 403

    # Front Desk has reports.view_basic, but NOT reports.view_profit -> 200, NO "profit" key
    r = front_desk_client.get(f"/api/v1/reports/summary/?from={test_date_str}&to={test_date_str}")
    assert r.status_code == 200
    fd_data = r.json()["data"]
    assert "profit" not in fd_data
    assert fd_data["jobs"]["received"] == 2
    assert fd_data["jobs"]["delivered"] == 1
    assert fd_data["jobs"]["by_status"]["diagnosing"] == 1
    assert fd_data["collections"]["total_paise"] == 200000
    assert fd_data["collections"]["by_mode"]["upi"] == 150000
    assert fd_data["collections"]["by_mode"]["cash"] == 50000
    assert fd_data["collections"]["refunds_paise"] == 20000
    assert fd_data["revenue"]["invoiced_paise"] == 200000
    assert fd_data["revenue"]["credit_notes_paise"] == 20000
    assert fd_data["revenue"]["net_paise"] == 180000

    # Owner has reports.view_profit -> 200, WITH "profit" key
    r = owner_client.get(f"/api/v1/reports/summary/?from={test_date_str}&to={test_date_str}")
    assert r.status_code == 200
    owner_data = r.json()["data"]
    assert "profit" in owner_data
    # Delivered job total (200000) - cost (80000) = gross profit (120000)
    assert owner_data["profit"]["parts_cost_paise"] == 80000
    assert owner_data["profit"]["gross_profit_paise"] == 120000

    # Date range > 366 days -> 400
    r = owner_client.get("/api/v1/reports/summary/?from=2024-01-01&to=2025-02-01")
    assert r.status_code == 400
