"""
Document generation services using WeasyPrint and Segno.
"""

from urllib.parse import quote
from zoneinfo import ZoneInfo

import segno
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.template.loader import render_to_string
from django.utils import timezone
from weasyprint import HTML

from apps.billing.models import Invoice
from apps.billing.payments import job_paid_paise
from apps.core.amount_words import amount_in_words
from apps.core.money import paise_to_rupees_str
from apps.jobs.models import Job
from apps.tenancy.models import Shop

IST = ZoneInfo("Asia/Kolkata")


def render_pdf(template: str, context: dict) -> bytes:
    """Renders a Django HTML template to PDF bytes using WeasyPrint."""
    fonts_dir = str(settings.BASE_DIR / "apps" / "documents" / "fonts")
    full_context = {
        "fonts_dir": fonts_dir,
        **context,
    }
    html = render_to_string(template, full_context)
    return HTML(string=html, base_url=str(settings.BASE_DIR)).write_pdf()


def qr_svg(data: str) -> str:
    """Generates an inline SVG string for the given string data."""
    return segno.make(data, error="m").svg_inline(scale=3)


def format_money_inr(paise: int) -> str:
    """Formats paise into INR string, e.g. ₹1299.50."""
    return f"₹{paise_to_rupees_str(paise)}"


def format_shop_address(data: dict | Shop) -> str:
    """Formats a multi-line or split shop address into a clean string."""
    if isinstance(data, dict):
        line1 = data.get("address_line1") or data.get("address") or ""
        line2 = data.get("address_line2") or ""
        city = data.get("city") or ""
        state = data.get("state_code") or ""
        pincode = data.get("pincode") or ""
    else:
        line1 = getattr(data, "address_line1", "") or ""
        line2 = getattr(data, "address_line2", "") or ""
        city = getattr(data, "city", "") or ""
        state = getattr(data, "state_code", "") or ""
        pincode = getattr(data, "pincode", "") or ""

    parts = [p.strip() for p in [line1, line2, city] if p and p.strip()]
    city_line = ", ".join(parts)
    if state and pincode:
        state_pincode = f"{state} - {pincode}"
    elif pincode:
        state_pincode = pincode
    elif state:
        state_pincode = state
    else:
        state_pincode = ""

    if city_line and state_pincode:
        return f"{city_line}, {state_pincode}"
    return city_line or state_pincode


def get_logo_url(logo_key: str | None) -> str | None:
    """Returns absolute file:// URI or storage URL for WeasyPrint."""
    if not logo_key or not default_storage.exists(logo_key):
        return None
    try:
        return f"file://{default_storage.path(logo_key)}"
    except (NotImplementedError, AttributeError):
        return default_storage.url(logo_key)


def invoice_pdf(invoice: Invoice, size: str = "a4") -> bytes:
    """
    Renders an invoice to PDF (A4 or A5).
    For issued/cancelled invoices:
      - Uses immutable frozen shop & customer snapshots.
      - Caches the generated PDF in storage under shops/{shop_id}/invoices/{id}-{size}.pdf.
      - Sets invoice.pdf_key.
    For drafts:
      - Renders live with a prominent DRAFT watermark and does not cache.
    """
    target_size = size.lower() if size.lower() in ("a4", "a5") else "a4"
    storage_path = f"shops/{invoice.shop_id}/invoices/{invoice.id}-{target_size}.pdf"

    # For issued invoices, check if already cached in storage
    if invoice.status == Invoice.Status.ISSUED and default_storage.exists(storage_path):
        with default_storage.open(storage_path, "rb") as f:
            return f.read()

    is_issued = invoice.status in (Invoice.Status.ISSUED, Invoice.Status.CANCELLED)

    # 1. Shop details
    if is_issued and invoice.shop_snapshot:
        logo_key = invoice.shop_snapshot.get("logo_key")
        shop_data = {
            "name": invoice.shop_snapshot.get("name") or invoice.shop.name,
            "address": format_shop_address(invoice.shop_snapshot),
            "phone": invoice.shop_snapshot.get("phone") or "",
            "gstin": invoice.shop_snapshot.get("gstin") or "",
            "upi_id": invoice.shop_snapshot.get("upi_id") or "",
            "logo_url": get_logo_url(logo_key),
        }
    else:
        logo_key = getattr(invoice.shop, "logo_key", None)
        shop_data = {
            "name": invoice.shop.name,
            "address": format_shop_address(invoice.shop),
            "phone": getattr(invoice.shop, "phone", "") or "",
            "gstin": getattr(invoice.shop, "gstin", "") or "",
            "upi_id": getattr(invoice.shop, "upi_id", "") or "",
            "logo_url": get_logo_url(logo_key),
        }

    # 2. Customer details
    if is_issued and invoice.customer_snapshot:
        customer_data = {
            "name": invoice.customer_snapshot.get("name") or "Walk-in Customer",
            "phone": invoice.customer_snapshot.get("phone") or "",
            "address": invoice.customer_snapshot.get("address") or "",
            "gstin": invoice.customer_gstin or invoice.customer_snapshot.get("gstin") or "",
        }
    elif invoice.customer:
        customer_data = {
            "name": invoice.customer.name,
            "phone": invoice.customer.phone or "",
            "address": invoice.customer.address or "",
            "gstin": invoice.customer_gstin or "",
        }
    else:
        customer_data = {
            "name": "Walk-in Customer",
            "phone": "",
            "address": "",
            "gstin": invoice.customer_gstin or "",
        }

    # 3. Document Title
    kind_titles = {
        Invoice.Kind.TAX_INVOICE: "Tax Invoice",
        Invoice.Kind.BILL_OF_SUPPLY: "Bill of Supply",
        Invoice.Kind.SIMPLE_BILL: "Invoice",
        Invoice.Kind.CREDIT_NOTE: "Credit Note",
    }
    title = kind_titles.get(invoice.kind, "Tax Invoice")

    # 4. Lines
    lines_context = []
    for line in invoice.lines.filter(deleted_at__isnull=True).order_by("position"):
        lines_context.append(
            {
                "description": line.description,
                "hsn_sac": line.hsn_sac,
                "quantity": line.quantity,
                "unit_price_paise": line.unit_price_paise,
                "unit_price_formatted": format_money_inr(line.unit_price_paise),
                "discount_paise": line.discount_paise,
                "discount_formatted": format_money_inr(line.discount_paise),
                "tax_rate_bp": line.tax_rate_bp,
                "tax_rate_percent": f"{line.tax_rate_bp / 100:.1f}".rstrip("0").rstrip("."),
                "line_total_paise": line.line_total_paise,
                "line_total_formatted": format_money_inr(line.line_total_paise),
            }
        )

    # 5. Place of supply
    from apps.core.validators import GST_STATE_CODES

    pos_code = invoice.place_of_supply_state or ""
    pos_name = GST_STATE_CODES.get(pos_code, "")
    place_of_supply = f"{pos_code} - {pos_name}" if pos_code and pos_name else pos_code

    # 6. Job info if available
    job_info = None
    tracking_qr_svg = None
    if invoice.job:
        job = invoice.job
        dev_name = ""
        if job.device:
            brand = job.device.brand.name if job.device.brand else (job.device.brand_text or "")
            dev_name = f"{brand} {job.device.model}".strip()

        imei_val = ""
        if job.device:
            first_id = job.device.identifiers.first()
            if first_id:
                imei_val = first_id.value

        job_info = {
            "job_no": job.job_no,
            "device_name": dev_name,
            "imei": imei_val,
        }
        if job.tracking_token:
            base_url = getattr(settings, "PUBLIC_TRACKING_BASE_URL", "https://track.fixpro.in").rstrip("/")
            tracking_url = f"{base_url}/t/{job.tracking_token}/"
            tracking_qr_svg = qr_svg(tracking_url)

    # 7. Dynamic UPI QR
    upi_qr_svg = None
    shop_upi = shop_data.get("upi_id")
    if shop_upi and invoice.balance_paise > 0:
        encoded_pn = quote(shop_data.get("name") or "Repair Shop")
        encoded_tn = quote(f"Invoice {invoice.number_display or ''}".strip())
        amount_str = f"{invoice.balance_paise / 100:.2f}"
        upi_uri = f"upi://pay?pa={shop_upi}&pn={encoded_pn}&am={amount_str}&cu=INR&tn={encoded_tn}"
        upi_qr_svg = qr_svg(upi_uri)

    # 8. Date formatting
    if invoice.issue_date:
        issue_date_str = invoice.issue_date.strftime("%d-%b-%Y")
    else:
        issue_date_str = timezone.now().astimezone(IST).strftime("%d-%b-%Y")

    is_gst = bool(shop_data.get("gstin")) or invoice.kind in (
        Invoice.Kind.TAX_INVOICE,
        Invoice.Kind.BILL_OF_SUPPLY,
    )
    is_inter_state = invoice.igst_paise > 0

    context = {
        "is_a5": target_size == "a5",
        "is_draft": invoice.status == Invoice.Status.DRAFT,
        "title": title,
        "invoice_number": invoice.number_display or "DRAFT",
        "issue_date": issue_date_str,
        "place_of_supply": place_of_supply,
        "original_invoice_number": getattr(invoice.original_invoice, "number_display", None),
        "shop": shop_data,
        "customer": customer_data,
        "job": job_info,
        "lines": lines_context,
        "is_gst": is_gst,
        "is_inter_state": is_inter_state,
        "subtotal_formatted": format_money_inr(invoice.subtotal_paise),
        "discount_paise": invoice.discount_paise,
        "discount_formatted": format_money_inr(invoice.discount_paise),
        "taxable_formatted": format_money_inr(invoice.taxable_paise),
        "cgst_formatted": format_money_inr(invoice.cgst_paise),
        "sgst_formatted": format_money_inr(invoice.sgst_paise),
        "igst_formatted": format_money_inr(invoice.igst_paise),
        "round_off_paise": invoice.round_off_paise,
        "round_off_formatted": format_money_inr(abs(invoice.round_off_paise)),
        "total_formatted": format_money_inr(invoice.total_paise),
        "amount_paid_formatted": format_money_inr(invoice.amount_paid_paise),
        "balance_paise": invoice.balance_paise,
        "balance_formatted": format_money_inr(invoice.balance_paise),
        "amount_in_words": amount_in_words(invoice.total_paise),
        "upi_qr_svg": upi_qr_svg,
        "tracking_qr_svg": tracking_qr_svg,
        "notes": invoice.notes,
        "terms": invoice.terms,
    }

    pdf_bytes = render_pdf("documents/invoice.html", context)

    # Cache if issued
    if invoice.status == Invoice.Status.ISSUED:
        if default_storage.exists(storage_path):
            default_storage.delete(storage_path)
        actual_path = default_storage.save(storage_path, ContentFile(pdf_bytes))
        invoice.pdf_key = actual_path
        invoice.save(update_fields=["pdf_key"])

    return pdf_bytes


def job_receipt_pdf(job: Job, size: str = "a4") -> bytes:
    """
    Renders a job intake receipt PDF (A4 or A5).
    Strict security rule: never includes lock value (PIN/pattern/password).
    """
    target_size = size.lower() if size.lower() in ("a4", "a5") else "a4"

    shop = job.shop
    logo_key = getattr(shop, "logo_key", None)
    shop_data = {
        "name": shop.name,
        "address": format_shop_address(shop),
        "phone": getattr(shop, "phone", "") or "",
        "gstin": getattr(shop, "gstin", "") or "",
        "logo_url": get_logo_url(logo_key),
    }

    customer_data = {
        "name": job.customer.name if job.customer else "Walk-in Customer",
        "phone": job.customer.phone if job.customer else "",
        "address": job.customer.address if job.customer else "",
    }

    dev_name = ""
    dev_color = ""
    identifiers = []
    if job.device:
        brand = job.device.brand.name if job.device.brand else (job.device.brand_text or "")
        dev_name = f"{brand} {job.device.model}".strip()
        dev_color = job.device.color or ""
        for ident in job.device.identifiers.all():
            identifiers.append({"type": ident.type, "value": ident.value})

    device_data = {
        "name": dev_name,
        "color": dev_color,
        "identifiers": identifiers,
    }

    # Format dates
    rec_at = job.received_at.astimezone(IST) if job.received_at else timezone.now().astimezone(IST)
    received_at_formatted = rec_at.strftime("%d-%b-%Y, %I:%M %p")
    expected_date_formatted = job.expected_date.strftime("%d-%b-%Y") if job.expected_date else ""

    # Financials
    paid_paise = job_paid_paise(job)
    estimate = job.total_paise if job.total_paise > 0 else job.estimate_paise
    balance = max(0, estimate - paid_paise)

    # Tracking QR
    tracking_qr_svg = None
    if job.tracking_token:
        base_url = getattr(settings, "PUBLIC_TRACKING_BASE_URL", "https://track.fixpro.in").rstrip("/")
        tracking_url = f"{base_url}/t/{job.tracking_token}/"
        tracking_qr_svg = qr_svg(tracking_url)

    job_data = {
        "job_no": job.job_no,
        "received_at_formatted": received_at_formatted,
        "expected_date_formatted": expected_date_formatted,
        "fault_description": job.fault_description,
        "device_condition": job.device_condition,
        "condition_tags": job.condition_tags or [],
        "accessories": [acc.name for acc in job.accessories.all()],
        "estimate_formatted": format_money_inr(estimate),
        "advance_formatted": format_money_inr(paid_paise),
        "balance_formatted": format_money_inr(balance),
    }

    terms = getattr(shop, "terms_job", "") or (
        "1. Please collect your device within 30 days of completion.\n"
        "2. The shop is not responsible for any data loss during repair. Please take a backup.\n"
        "3. Physical damage or liquid ingress post-delivery voids all repair warranties."
    )

    context = {
        "is_a5": target_size == "a5",
        "shop": shop_data,
        "customer": customer_data,
        "device": device_data,
        "job": job_data,
        "tracking_qr_svg": tracking_qr_svg,
        "terms": terms,
    }

    return render_pdf("documents/job_receipt.html", context)
