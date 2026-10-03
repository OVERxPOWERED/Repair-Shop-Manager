import re
from datetime import timedelta
from urllib.parse import quote

import segno
from django.http import Http404, HttpResponse
from django.shortcuts import render
from django.utils import timezone

from apps.billing.models import Invoice
from apps.billing.payments import job_balance_paise
from apps.core.money import paise_to_rupees_str
from apps.core.ratelimit import allow_request
from apps.documents.services import format_shop_address, invoice_pdf
from apps.jobs.models import Job
from apps.tracking.strings import STATUS_KEY_MAP, STATUS_MILESTONES, STRINGS

TOKEN_RE = re.compile(r"^[A-Za-z0-9_-]{20,64}$")


def set_security_headers(response: HttpResponse) -> HttpResponse:
    """Applies privacy and search-engine exclusion headers."""
    response["X-Robots-Tag"] = "noindex, nofollow"
    response["Cache-Control"] = "private, max-age=60"
    response["Referrer-Policy"] = "no-referrer"
    return response


def tracking_page(request, token: str):
    """
    Public server-rendered tracking view for repair status.
    Strictly prevents leaking sensitive customer, technician, or hardware data.
    """
    # 1. Rate limiting (60 requests per minute per IP)
    if not allow_request(request, scope="tracking", limit=60, window_seconds=60):
        response = render(
            request,
            "tracking/rate_limited.html",
            {"s": STRINGS.get("en")},
            status=429,
        )
        return set_security_headers(response)

    # 2. Fast rejection of malformed tokens without DB query
    if not TOKEN_RE.match(token):
        response = render(
            request,
            "tracking/not_found.html",
            {"s": STRINGS.get("en")},
            status=404,
        )
        return set_security_headers(response)

    # 3. Query job with scoped conditions
    job = (
        Job.objects.select_related("shop", "device", "device__brand", "customer")
        .filter(
            tracking_token=token,
            shop__tracking_enabled=True,
            shop__deleted_at__isnull=True,
            deleted_at__isnull=True,
        )
        .first()
    )
    if job is None:
        response = render(
            request,
            "tracking/not_found.html",
            {"s": STRINGS.get("en")},
            status=404,
        )
        return set_security_headers(response)

    # 4. Check tracking expiration after delivery
    expiry_days = getattr(job.shop, "tracking_expiry_days", 30) or 30
    if job.delivered_at and timezone.now() > job.delivered_at + timedelta(days=expiry_days):
        response = render(
            request,
            "tracking/expired.html",
            {"s": STRINGS.get(getattr(job.customer, "preferred_locale", "en"), STRINGS["en"])},
            status=410,
        )
        return set_security_headers(response)

    # 5. Language resolution: ?lang= query param -> customer preferred_locale -> "en"
    lang = request.GET.get("lang")
    if lang not in STRINGS:
        lang = getattr(job.customer, "preferred_locale", "en")
    if lang not in STRINGS:
        lang = "en"
    s = STRINGS[lang]

    # 6. Customer First Name only
    customer_full_name = getattr(job.customer, "name", "") or ""
    customer_first_name = customer_full_name.split()[0] if customer_full_name else "Customer"

    # 7. Device brand + model (strictly NO IMEI)
    brand_name = (
        job.device.brand.name if getattr(job.device, "brand", None) else getattr(job.device, "brand_name", "") or ""
    )
    device_name = f"{brand_name} {job.device.model}".strip()

    # 8. Status and Milestones
    status_key = STATUS_KEY_MAP.get(job.status, "received")
    status_label = s["statuses"].get(status_key, job.status)

    milestone_items = []
    if status_key == "closed":
        curr_idx = -1
    else:
        curr_idx = STATUS_MILESTONES.index(status_key) if status_key in STATUS_MILESTONES else 0

    for idx, m_key in enumerate(STATUS_MILESTONES):
        milestone_items.append(
            {
                "key": m_key,
                "label": s["statuses"].get(m_key, m_key.title()),
                "is_done": curr_idx >= 0 and idx < curr_idx,
                "is_current": curr_idx >= 0 and idx == curr_idx,
            }
        )

    # 9. Expected Date
    expected_date_str = None
    if job.expected_date:
        expected_date_str = job.expected_date.strftime("%d %b %Y")

    # 10. Customer-visible notes only (strictly NO internal notes)
    customer_notes = list(
        job.notes.filter(visibility="customer", deleted_at__isnull=True)
        .order_by("created_at")
        .values_list("body", flat=True)
    )

    # 11. Balance due and UPI QR
    balance_paise = max(0, job_balance_paise(job))
    balance_formatted = f"₹{paise_to_rupees_str(balance_paise)}" if balance_paise > 0 else ""

    upi_qr_svg = None
    pay_upi_url = None
    if balance_paise > 0 and job.shop.upi_id:
        amount_rupees = f"{balance_paise / 100:.2f}"
        shop_name_clean = job.shop.name
        note_clean = f"Job #{job.job_no}"
        upi_uri = (
            f"upi://pay?pa={job.shop.upi_id}"
            f"&pn={quote(shop_name_clean)}"
            f"&am={amount_rupees}"
            f"&cu=INR"
            f"&tn={quote(note_clean)}"
        )
        pay_upi_url = upi_uri
        try:
            upi_qr_svg = segno.make(upi_uri, error="m").svg_inline(scale=4)
        except Exception:
            upi_qr_svg = None

    # 12. Issued invoice PDF link
    has_issued_invoice = Invoice.objects.filter(job=job, status=Invoice.Status.ISSUED, deleted_at__isnull=True).exists()
    invoice_pdf_url = f"/t/{token}/invoice.pdf" if has_issued_invoice else None

    # 13. Warranty until date
    warranty_date_str = None
    warranty_until_str = ""
    if job.delivered_at and job.warranty_until:
        warranty_date_str = job.warranty_until.strftime("%d %b %Y")
        warranty_until_str = s.get("warranty_until", "Warranty valid until {date}").format(date=warranty_date_str)

    # 14. Pre-formatted string labels
    greeting_str = s.get("greeting", "Hello, {name}").format(name=customer_first_name)
    job_no_str = s.get("job_no", "Job #{job_no}").format(job_no=job.job_no)
    pay_upi_label = (
        s.get("pay_upi", "Pay ₹{amount} by UPI").format(amount=paise_to_rupees_str(balance_paise))
        if balance_paise > 0
        else ""
    )

    # 15. Shop details (safe public contact info)
    shop_data = {
        "name": job.shop.name,
        "phone": job.shop.phone,
        "address": format_shop_address(job.shop),
    }

    context = {
        "s": s,
        "lang": lang,
        "token": token,
        "shop": shop_data,
        "job_no": job.job_no,
        "job_no_str": job_no_str,
        "greeting_str": greeting_str,
        "customer_first_name": customer_first_name,
        "device_name": device_name,
        "status_key": status_key,
        "status_label": status_label,
        "milestones": milestone_items,
        "is_closed": status_key == "closed",
        "expected_date": expected_date_str,
        "notes": customer_notes,
        "balance_paise": balance_paise,
        "balance_formatted": balance_formatted,
        "upi_qr_svg": upi_qr_svg,
        "pay_upi_url": pay_upi_url,
        "pay_upi_label": pay_upi_label,
        "invoice_pdf_url": invoice_pdf_url,
        "warranty_until": warranty_until_str,
    }

    response = render(request, "tracking/page.html", context)
    return set_security_headers(response)


def tracking_invoice_pdf(request, token: str):
    """
    Public endpoint to download invoice PDF for a job via its tracking token.
    Only allows downloads if an issued invoice exists.
    """
    # 1. Rate limiting
    if not allow_request(request, scope="tracking", limit=60, window_seconds=60):
        response = HttpResponse("Too Many Requests", status=429, content_type="text/plain")
        return set_security_headers(response)

    # 2. Fast rejection of malformed tokens
    if not TOKEN_RE.match(token):
        raise Http404("Invalid tracking token")

    # 3. Query job
    job = (
        Job.objects.select_related("shop")
        .filter(
            tracking_token=token,
            shop__tracking_enabled=True,
            shop__deleted_at__isnull=True,
            deleted_at__isnull=True,
        )
        .first()
    )
    if not job:
        raise Http404("Tracking job not found")

    # 4. Query issued invoice
    invoice = (
        Invoice.objects.filter(
            job=job,
            status=Invoice.Status.ISSUED,
            deleted_at__isnull=True,
        )
        .exclude(kind=Invoice.Kind.CREDIT_NOTE)
        .first()
    )
    if not invoice:
        raise Http404("Issued invoice not available for this job")

    # 5. Generate PDF
    pdf_bytes = invoice_pdf(invoice, size="a4")
    safe_number = (invoice.number_display or f"INV-{invoice.id[:8]}").replace("/", "-")
    filename = f"{safe_number}.pdf"

    response = HttpResponse(pdf_bytes, content_type="application/pdf")
    response["Content-Disposition"] = f'inline; filename="{filename}"'
    return set_security_headers(response)
