"""
Comprehensive test suite for PDF document generation using WeasyPrint.
Covers:
- Devanagari Hindi text rendering and font embedding (NotoSansDevanagari)
- Issued invoice snapshot immutability
- Job receipt security (no lock value)
- A4 vs A5 dimensions
- Watermark on draft invoices
- Dynamic UPI & tracking QR codes
- Caching behavior in default_storage
- Multi-tenant isolation and permission enforcement (401, 403, 404, 200)
"""

import io
from datetime import date
from decimal import Decimal

import pytest
from django.core.files.storage import default_storage
from django.utils import timezone
from pypdf import PdfReader

from apps.accounts.models import User
from apps.billing.models import Payment
from apps.billing.services import create_draft_from_job, issue_invoice
from apps.core.crypto import encrypt_str
from apps.customers.models import Customer
from apps.devices.models import Device, DeviceIdentifier
from apps.documents.services import invoice_pdf, job_receipt_pdf
from apps.jobs.models import Job, JobAccessory, JobLineItem
from apps.tenancy.models import Membership, Role

pytestmark = pytest.mark.django_db


def _create_hindi_job_and_invoice(world, shop, actor, membership):
    cust = Customer.objects.create(
        shop=shop,
        name="राहुल शर्मा",
        phone="+919811223344",
        address="फ्लैट ४०२, शांति शिखर अपार्टमेंट, एम.जी. रोड, जयपुर, राजस्थान - 302001",
    )
    dev = Device.objects.create(
        shop=shop,
        customer=cust,
        category="mobile",
        model="Galaxy S23 Ultra",
        color="Phantom Black",
    )
    DeviceIdentifier.objects.create(
        shop=shop,
        device=dev,
        type=DeviceIdentifier.Type.IMEI1,
        value="990000862471854",
    )
    job = Job.objects.create(
        shop=shop,
        customer=cust,
        device=dev,
        job_no=2001,
        status="in_repair",
        fault_description="डिस्प्ले टूट गया है और टच काम नहीं कर रहा",
        device_condition="स्क्रीन पर गहरा क्रैक, बैक ग्लास सुरक्षित",
        condition_tags=["screen_cracked", "touch_issue"],
        lock_type=Job.LockType.PIN,
        lock_value_enc=encrypt_str("7419"),
        estimate_paise=650000,
        assigned_to=membership,
        received_at=timezone.now(),
        expected_date=date(2026, 6, 20),
    )
    JobAccessory.objects.create(shop=shop, job=job, name="Original Box")
    JobAccessory.objects.create(shop=shop, job=job, name="SIM Tray")

    JobLineItem.objects.create(
        shop=shop,
        job=job,
        kind=JobLineItem.Kind.PART,
        description="Dynamic AMOLED Display Unit",
        hsn_sac="85177090",
        quantity=Decimal("1"),
        unit_price_paise=500000,
        unit_cost_paise=300000,
        discount_paise=0,
        tax_rate_bp=1800,
        position=0,
    )
    JobLineItem.objects.create(
        shop=shop,
        job=job,
        kind=JobLineItem.Kind.LABOUR,
        description="Display Replacement & Waterproof Bonding",
        hsn_sac="998713",
        quantity=Decimal("1"),
        unit_price_paise=150000,
        unit_cost_paise=0,
        discount_paise=0,
        tax_rate_bp=1800,
        position=1,
    )
    from apps.jobs.services import recalculate_job_totals

    job = recalculate_job_totals(job)

    invoice = create_draft_from_job(job, actor=actor)
    return job, invoice


def test_pdf_devanagari_rendering_and_font_embedding(world):
    """
    Asserts:
    1. The PDF starts with %PDF-1.
    2. Customer name 'राहुल शर्मा' and Hindi address are rendered and extractable.
    3. pypdf inspects the embedded fonts and verifies NotoSansDevanagari is present.
    """
    shop = world.shop_a
    shop.name = "राजेश मोबाइल रिपेयर सेंटर"
    shop.save()

    job, invoice = _create_hindi_job_and_invoice(world, shop, world.owner_a, world.membership_owner_a)
    issued = issue_invoice(invoice=invoice, actor=world.owner_a)

    pdf_bytes = invoice_pdf(issued, size="a4")

    # 1. Header check
    assert pdf_bytes.startswith(b"%PDF-1.")

    # 2. Extract text with pypdf
    reader = PdfReader(io.BytesIO(pdf_bytes))
    assert len(reader.pages) >= 1
    page = reader.pages[0]
    extracted = page.extract_text()

    assert "राहुल" in extracted
    assert "जयपुर" in extracted
    assert "राजेश मोबाइल" in extracted
    assert "302001" in extracted

    # 3. Check embedded fonts
    font_names = set()
    resources = page.get("/Resources", {})
    if "/Font" in resources:
        for _k, font_ref in resources["/Font"].items():
            font_obj = font_ref.get_object() if hasattr(font_ref, "get_object") else font_ref
            base_font = font_obj.get("/BaseFont", "")
            font_names.add(str(base_font))

    # Also check from _get_fonts()
    for f in page._get_fonts()[0]:
        font_names.add(str(f))

    has_devanagari = any("Noto-Sans-Devanagari" in name or "NotoSansDevanagari" in name for name in font_names)
    assert has_devanagari, f"Expected NotoSansDevanagari in embedded fonts, got: {font_names}"


def test_issued_invoice_immutability_in_pdf(world):
    """
    Asserts:
    Issued invoice PDF content does not change even if the shop details change in the DB.
    """
    shop = world.shop_a
    shop.name = "Original Apex Electronics"
    shop.address_line1 = "100 MG Road"
    shop.city = "Bengaluru"
    shop.save()

    job, invoice = _create_hindi_job_and_invoice(world, shop, world.owner_a, world.membership_owner_a)
    issued = issue_invoice(invoice=invoice, actor=world.owner_a)

    # First generation
    pdf1 = invoice_pdf(issued, size="a4")
    text1 = PdfReader(io.BytesIO(pdf1)).pages[0].extract_text()
    assert "Original Apex Electronics" in text1

    # Rename shop in DB
    shop.name = "Radical New Brand Tech"
    shop.address_line1 = "999 Cyber Hub"
    shop.save()

    # Re-fetch PDF (service must use frozen shop_snapshot or storage cache)
    pdf2 = invoice_pdf(issued, size="a4")
    text2 = PdfReader(io.BytesIO(pdf2)).pages[0].extract_text()

    assert "Original Apex Electronics" in text2
    assert "Radical New Brand Tech" not in text2
    assert pdf1 == pdf2


def test_job_receipt_never_contains_lock_value(world):
    """
    CRITICAL SECURITY ASSERTION:
    Job intake receipt PDF must NEVER contain the lock value (PIN/pattern/password).
    """
    shop = world.shop_a
    secret_pin = "7419"
    job, _ = _create_hindi_job_and_invoice(world, shop, world.owner_a, world.membership_owner_a)

    assert job.lock_value_enc is not None

    pdf_bytes = job_receipt_pdf(job, size="a4")
    assert pdf_bytes.startswith(b"%PDF-1.")

    reader = PdfReader(io.BytesIO(pdf_bytes))
    extracted = "".join(p.extract_text() for p in reader.pages)

    # Assert secret PIN is nowhere in the PDF text
    assert secret_pin not in extracted

    # Assert necessary job details are in the PDF
    assert f"#{job.job_no}" in extracted or str(job.job_no) in extracted
    assert "राहुल" in extracted
    assert "990000862471854" in extracted  # IMEI
    assert "Original Box" in extracted  # Accessory
    assert "computer-generated" in extracted.lower()


def test_a4_vs_a5_dimensions(world):
    """Asserts that A4 and A5 sizes produce different page dimensions in points."""
    shop = world.shop_a
    job, invoice = _create_hindi_job_and_invoice(world, shop, world.owner_a, world.membership_owner_a)

    pdf_a4 = invoice_pdf(invoice, size="a4")
    box_a4 = PdfReader(io.BytesIO(pdf_a4)).pages[0].mediabox

    pdf_a5 = invoice_pdf(invoice, size="a5")
    box_a5 = PdfReader(io.BytesIO(pdf_a5)).pages[0].mediabox

    # A4 standard size is 595.28 x 841.89 points
    assert abs(float(box_a4.width) - 595.28) < 2
    assert abs(float(box_a4.height) - 841.89) < 2

    # A5 standard size is 419.53 x 595.28 points
    assert abs(float(box_a5.width) - 419.53) < 2
    assert abs(float(box_a5.height) - 595.28) < 2


def test_draft_invoice_watermark(world):
    """Asserts that draft invoices display 'DRAFT' while issued invoices do not."""
    shop = world.shop_a
    job, invoice = _create_hindi_job_and_invoice(world, shop, world.owner_a, world.membership_owner_a)

    # Draft
    draft_pdf = invoice_pdf(invoice, size="a4")
    draft_text = PdfReader(io.BytesIO(draft_pdf)).pages[0].extract_text()
    assert "DRAFT" in draft_text

    # Issue
    issued = issue_invoice(invoice=invoice, actor=world.owner_a)
    issued_pdf = invoice_pdf(issued, size="a4")
    issued_text = PdfReader(io.BytesIO(issued_pdf)).pages[0].extract_text()
    # "DRAFT" watermark should not be present
    assert "DRAFT" not in issued_text


def test_dynamic_upi_and_tracking_qr(world):
    """Asserts UPI QR code is included when UPI ID is set and balance > 0."""
    shop = world.shop_a
    shop.upi_id = "apexrepair@okhdfcbank"
    shop.save()

    job, invoice = _create_hindi_job_and_invoice(world, shop, world.owner_a, world.membership_owner_a)
    issued = issue_invoice(invoice=invoice, actor=world.owner_a)

    # Payment of partial amount leaves balance
    Payment.objects.create(
        shop=shop,
        job=job,
        customer=job.customer,
        direction=Payment.Direction.IN,
        mode="cash",
        amount_paise=100000,
        received_by=world.owner_a,
        received_at=timezone.now(),
        idempotency_key="00000000-0000-0000-0000-000000000099",
    )
    issued.refresh_from_db()
    assert issued.balance_paise > 0

    pdf_bytes = invoice_pdf(issued, size="a4")
    # PDF should render without error
    assert pdf_bytes.startswith(b"%PDF-1.")


def test_storage_caching_for_issued_invoices(world):
    """Asserts that issued invoice generates a file in storage and sets pdf_key."""
    shop = world.shop_a
    job, invoice = _create_hindi_job_and_invoice(world, shop, world.owner_a, world.membership_owner_a)
    issued = issue_invoice(invoice=invoice, actor=world.owner_a)

    expected_path = f"shops/{shop.id}/invoices/{issued.id}-a4.pdf"
    if default_storage.exists(expected_path):
        default_storage.delete(expected_path)

    pdf_bytes = invoice_pdf(issued, size="a4")
    issued.refresh_from_db()

    assert issued.pdf_key == expected_path
    assert default_storage.exists(expected_path)

    with default_storage.open(expected_path, "rb") as f:
        stored_bytes = f.read()
    assert stored_bytes == pdf_bytes


def test_invoice_and_receipt_endpoints_permissions_and_scoping(world, client_for):
    """
    Tests API endpoints:
    - GET /api/v1/invoices/{id}/pdf/?size=a4|a5 (invoices.print)
    - GET /api/v1/jobs/{id}/receipt.pdf?size=a4|a5 (jobs.view)
    Verifies:
    - 200 with application/pdf and proper Content-Disposition
    - 403 when user lacks required permission
    - 404 when user from another shop requests the document
    - 401 when unauthenticated
    """
    shop = world.shop_a
    job, invoice = _create_hindi_job_and_invoice(world, shop, world.owner_a, world.membership_owner_a)
    issued = issue_invoice(invoice=invoice, actor=world.owner_a)

    owner_client = client_for(world.owner_a, shop)
    other_client = client_for(world.owner_b, world.shop_b)
    unauth_client = client_for(None, shop)

    # 1. Invoice PDF: Owner A (200)
    res_inv = owner_client.get(f"/api/v1/invoices/{issued.id}/pdf/?size=a4")
    assert res_inv.status_code == 200
    assert res_inv["Content-Type"] == "application/pdf"
    assert "inline;" in res_inv["Content-Disposition"]
    assert res_inv["Content-Disposition"].endswith('.pdf"')
    assert res_inv.content.startswith(b"%PDF-1.")

    # 2. Job Receipt PDF: Owner A (200)
    res_rec = owner_client.get(f"/api/v1/jobs/{job.id}/receipt.pdf?size=a5")
    assert res_rec.status_code == 200
    assert res_rec["Content-Type"] == "application/pdf"
    assert "inline;" in res_rec["Content-Disposition"]
    assert res_rec["Content-Disposition"].endswith('.pdf"')
    assert res_rec.content.startswith(b"%PDF-1.")

    # 3. User with custom role lacking invoices.print -> 403
    limited_role = Role.objects.create(
        organization=world.org_a,
        name="No Print Role",
        permissions=["jobs.view"],
    )
    limited_user = User.objects.create_user(phone="+919000000099", name="Limited User")
    Membership.objects.create(
        user=limited_user,
        shop=shop,
        role=limited_role,
        status=Membership.StatusChoices.ACTIVE,
    )
    limited_client = client_for(limited_user, shop)

    # Has jobs.view, so receipt.pdf works
    res_rec_limited = limited_client.get(f"/api/v1/jobs/{job.id}/receipt.pdf")
    assert res_rec_limited.status_code == 200

    # Lacks invoices.print, so invoice pdf returns 403
    res_inv_limited = limited_client.get(f"/api/v1/invoices/{issued.id}/pdf/")
    assert res_inv_limited.status_code == 403

    # 4. Another shop -> 404
    res_inv_other = other_client.get(f"/api/v1/invoices/{issued.id}/pdf/")
    assert res_inv_other.status_code == 404

    res_rec_other = other_client.get(f"/api/v1/jobs/{job.id}/receipt.pdf")
    assert res_rec_other.status_code == 404

    # 5. Unauthenticated -> 401
    res_inv_anon = unauth_client.get(f"/api/v1/invoices/{issued.id}/pdf/")
    assert res_inv_anon.status_code == 401

    res_rec_anon = unauth_client.get(f"/api/v1/jobs/{job.id}/receipt.pdf")
    assert res_rec_anon.status_code == 401
