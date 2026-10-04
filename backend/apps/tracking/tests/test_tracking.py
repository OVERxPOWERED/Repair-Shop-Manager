"""
Comprehensive test suite for the public repair tracking page (Phase 1 Subphase 1.18).
Covers:
- Valid token renders tracking page in customer's preferred language; ?lang= overrides
- Malformed token yields 404 without a database query (django_assert_num_queries(0))
- Random non-existent valid token yields 404
- shop.tracking_enabled=False yields 404
- Delivered job past tracking_expiry_days yields 410
- Security information hiding: assert absence of customer phone, IMEI, lock credentials,
  internal notes, technician name, and job UUID
- Rate limiting: 61 requests in 1 minute from 1 IP yields 429
- Tracking invoice PDF endpoint returns PDF only for issued invoices
- Security and privacy response headers
"""

from datetime import timedelta

import pytest
from django.core.cache import cache
from django.test import Client
from django.utils import timezone

from apps.billing.models import Invoice
from apps.billing.services import create_draft_from_job, issue_invoice
from apps.core.crypto import encrypt_str
from apps.customers.models import Customer
from apps.devices.models import Device, DeviceIdentifier
from apps.jobs.models import Job, JobLineItem, JobNote, JobStatus

pytestmark = pytest.mark.django_db


@pytest.fixture
def tracking_setup(world):
    shop = world.shop_a
    shop.phone = "9820098200"
    shop.address_line1 = "Shop 4, Market Road"
    shop.city = "Mumbai"
    shop.pincode = "400001"
    shop.upi_id = "fixpro@okaxis"
    shop.tracking_enabled = True
    shop.tracking_expiry_days = 30
    shop.save()

    cust = Customer.objects.create(
        shop=shop,
        name="Rajesh Kumar",
        phone="+919876543210",
        preferred_locale="hi",
    )
    dev = Device.objects.create(
        shop=shop,
        customer=cust,
        category="mobile",
        model="OnePlus 9 Pro",
        color="Morning Mist",
    )
    DeviceIdentifier.objects.create(
        shop=shop,
        device=dev,
        type=DeviceIdentifier.Type.IMEI1,
        value="867823049182341",
    )
    job = Job.objects.create(
        shop=shop,
        customer=cust,
        device=dev,
        job_no=1055,
        status=JobStatus.DIAGNOSING,
        assigned_to=world.membership_engineer_a,
        fault_description="Display flickering and no charge",
        lock_type=Job.LockType.PIN,
        lock_value_enc=encrypt_str("9876"),
        estimate_paise=450000,
        expected_date=timezone.now().date() + timedelta(days=2),
        received_at=timezone.now(),
    )
    JobNote.objects.create(
        shop=shop,
        job=job,
        author=world.engineer_a,
        visibility=JobNote.Visibility.INTERNAL,
        body="Motherboard power rail shorted near PMIC",
    )
    JobNote.objects.create(
        shop=shop,
        job=job,
        author=world.engineer_a,
        visibility=JobNote.Visibility.CUSTOMER,
        body="Parts ordered, display arrival expected tomorrow",
    )

    return {
        "shop": shop,
        "customer": cust,
        "device": dev,
        "job": job,
        "client": Client(),
    }


def test_valid_token_customer_language_and_override(tracking_setup):
    job = tracking_setup["job"]
    client = tracking_setup["client"]

    # 1. Customer's preferred_locale is "hi" -> renders Hindi
    url = f"/t/{job.tracking_token}/"
    res = client.get(url)
    assert res.status_code == 200
    html = res.content.decode("utf-8")
    assert "जाँच जारी" in html  # Simplified "checking" status in Hindi
    assert "नमस्ते, Rajesh" in html
    assert "जॉब #1055" in html

    # 2. Query param ?lang=en overrides to English
    res_en = client.get(f"{url}?lang=en")
    assert res_en.status_code == 200
    html_en = res_en.content.decode("utf-8")
    assert "Checking" in html_en
    assert "Hello, Rajesh" in html_en
    assert "Job #1055" in html_en

    # 3. Query param ?lang=hi-Latn overrides to Hinglish
    res_latn = client.get(f"{url}?lang=hi-Latn")
    assert res_latn.status_code == 200
    html_latn = res_latn.content.decode("utf-8")
    assert "Checking" in html_latn
    assert "Shop ki taraf se update" in html_latn


def test_malformed_token_rejects_without_db_query(tracking_setup, django_assert_num_queries):
    client = tracking_setup["client"]

    # Invalid tokens that fail regex TOKEN_RE = ^[A-Za-z0-9_-]{20,64}$
    malformed_tokens = [
        "short",
        "has spaces in token",
        "invalid!chars@here$",
        "<script>alert(1)</script>",
        "../../etc/passwd",
    ]

    for bad_token in malformed_tokens:
        with django_assert_num_queries(0):
            res = client.get(f"/t/{bad_token}/")
            assert res.status_code == 404


def test_random_valid_format_token_returns_404(tracking_setup):
    client = tracking_setup["client"]
    # 32 characters valid format token that does not exist in DB
    random_token = "abcdefghijklmnopqrstuvwxyz123456"
    res = client.get(f"/t/{random_token}/")
    assert res.status_code == 404


def test_shop_tracking_disabled_returns_404(tracking_setup):
    job = tracking_setup["job"]
    shop = tracking_setup["shop"]
    client = tracking_setup["client"]

    shop.tracking_enabled = False
    shop.save()

    res = client.get(f"/t/{job.tracking_token}/")
    assert res.status_code == 404


def test_delivered_job_expiry(tracking_setup):
    job = tracking_setup["job"]
    client = tracking_setup["client"]

    job.status = JobStatus.DELIVERED
    # Delivered 5 days ago with 30 days expiry -> active
    job.delivered_at = timezone.now() - timedelta(days=5)
    job.save()

    res_active = client.get(f"/t/{job.tracking_token}/")
    assert res_active.status_code == 200

    # Delivered 31 days ago with 30 days expiry -> 410 Expired
    job.delivered_at = timezone.now() - timedelta(days=31)
    job.save()

    res_expired = client.get(f"/t/{job.tracking_token}/")
    assert res_expired.status_code == 410


def test_security_information_hiding(tracking_setup, world):
    job = tracking_setup["job"]
    client = tracking_setup["client"]

    res = client.get(f"/t/{job.tracking_token}/?lang=en")
    assert res.status_code == 200
    html = res.content.decode("utf-8")

    # What MUST be present:
    assert "Rajesh" in html  # Customer first name
    assert "OnePlus 9 Pro" in html  # Device
    assert "Parts ordered, display arrival expected tomorrow" in html  # Customer note
    assert "Job #1055" in html

    # What MUST NEVER be present (Strict security rules):
    assert "9876543210" not in html  # Full customer phone
    assert "+919876543210" not in html
    assert "867823049182341" not in html  # IMEI
    assert "9876" not in html  # Lock PIN
    assert "Motherboard power rail shorted" not in html  # Internal note
    if world.engineer_a.name:
        assert world.engineer_a.name not in html  # Technician name
    assert str(job.id) not in html  # Job internal UUID
    assert str(job.customer.id) not in html  # Customer internal UUID
    assert str(job.device.id) not in html  # Device internal UUID


def test_rate_limiting_60_req_per_minute(tracking_setup):
    job = tracking_setup["job"]
    client = Client(REMOTE_ADDR="198.51.100.42")
    cache.clear()

    url = f"/t/{job.tracking_token}/"

    # Requests 1..60 succeed
    for _ in range(60):
        res = client.get(url)
        assert res.status_code == 200

    # 61st request in the same window yields 429
    res_blocked = client.get(url)
    assert res_blocked.status_code == 429


def test_tracking_invoice_pdf_endpoint(tracking_setup, world):
    job = tracking_setup["job"]
    client = tracking_setup["client"]
    url = f"/t/{job.tracking_token}/invoice.pdf"

    # 1. No invoice created yet -> 404
    res_none = client.get(url)
    assert res_none.status_code == 404

    # 2. Add line items and create draft invoice
    JobLineItem.objects.create(
        shop=world.shop_a,
        job=job,
        kind=JobLineItem.Kind.PART,
        description="Display Combo",
        quantity=1,
        unit_price_paise=450000,
    )
    job.total_paise = 450000
    job.save()

    inv = create_draft_from_job(job=job, actor=world.owner_a)
    assert inv.status == Invoice.Status.DRAFT

    # Draft invoice is NOT public -> 404
    res_draft = client.get(url)
    assert res_draft.status_code == 404

    # 3. Issue invoice -> public download succeeds (200 application/pdf)
    inv_issued = issue_invoice(invoice=inv, actor=world.owner_a)
    assert inv_issued.status == Invoice.Status.ISSUED

    res_pdf = client.get(url)
    assert res_pdf.status_code == 200
    assert res_pdf["Content-Type"] == "application/pdf"
    assert len(res_pdf.content) > 1000

    # Verify tracking page itself now displays the invoice link
    page_res = client.get(f"/t/{job.tracking_token}/")
    assert page_res.status_code == 200
    assert url in page_res.content.decode("utf-8")


def test_security_headers(tracking_setup):
    job = tracking_setup["job"]
    client = tracking_setup["client"]

    res = client.get(f"/t/{job.tracking_token}/")
    assert res["X-Robots-Tag"] == "noindex, nofollow"
    assert "private" in res["Cache-Control"]
    assert res["Referrer-Policy"] == "no-referrer"


def test_tracking_strings_completeness_across_all_locales():
    """Verify that every tracking page string and status has translations in hi and hi-Latn."""
    from apps.messaging.models import MessageTemplate
    from apps.tracking.strings import STRINGS

    en_strings = STRINGS["en"]
    for lang in ("hi", "hi-Latn"):
        assert lang in STRINGS, f"Language {lang} missing from STRINGS"
        lang_strings = STRINGS[lang]
        for key, val in en_strings.items():
            assert key in lang_strings, f"Key '{key}' missing for locale '{lang}'"
            if isinstance(val, dict):
                for subk in val:
                    assert subk in lang_strings[key], f"Subkey '{subk}' under '{key}' missing for locale '{lang}'"

    # Also verify platform default MessageTemplates exist across all 3 locales
    en_templates = MessageTemplate.objects.filter(shop__isnull=True, locale="en")
    for tmpl in en_templates:
        for lang in ("hi", "hi-Latn"):
            match = MessageTemplate.objects.filter(
                shop__isnull=True,
                key=tmpl.key,
                channel=tmpl.channel,
                locale=lang,
            ).first()
            assert match is not None, f"Missing template for {tmpl.key} ({tmpl.channel}) in locale {lang}"
