"""
Domain services for invoices: drafting from jobs, recalculating totals, issuing,
cancelling via credit notes, and managing draft lines.
"""

from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from apps.audit.services import record_audit, snapshot
from apps.billing.models import Invoice, InvoiceLine, Payment
from apps.billing.numbering import next_invoice_number
from apps.billing.tax import (
    LineInput,
    compute_line,
    invoice_kind_for,
    is_intra_state,
    round_off,
)
from apps.core.api.errors import ConflictError, DomainError
from apps.core.money import mul_qty
from apps.core.time import today_ist
from apps.core.validators import validate_gstin, validate_state_code
from apps.jobs.models import Job


def create_draft_from_job(job: Job, actor, request=None) -> Invoice:
    """
    Creates a draft invoice from a job sheet.
    Rejects if a live (draft or issued) invoice already exists for this job.
    Copies job line items into invoice lines and computes tax/totals.
    """
    with transaction.atomic():
        locked_job = Job.objects.select_for_update().get(id=job.id, shop=job.shop)

        existing = (
            locked_job.invoices.filter(
                status__in=[Invoice.Status.DRAFT, Invoice.Status.ISSUED],
                deleted_at__isnull=True,
            )
            .exclude(kind=Invoice.Kind.CREDIT_NOTE)
            .first()
        )
        if existing:
            raise ConflictError("Invoice already exists for this job.", code="invoice.already_exists")

        kind = invoice_kind_for(locked_job.shop)
        intra_state = is_intra_state(
            shop_state_code=locked_job.shop.state_code,
            customer_gstin="",
            place_of_supply_state=locked_job.shop.state_code,
        )
        charge_tax = kind == Invoice.Kind.TAX_INVOICE

        invoice = Invoice.objects.create(
            shop=locked_job.shop,
            job=locked_job,
            customer=locked_job.customer,
            kind=kind,
            status=Invoice.Status.DRAFT,
            place_of_supply_state=locked_job.shop.state_code or "",
            customer_gstin="",
            notes="",
            terms="",
        )

        job_items = locked_job.line_items.filter(deleted_at__isnull=True).order_by("position", "created_at")
        for pos, item in enumerate(job_items):
            line_in = LineInput(
                quantity=item.quantity,
                unit_price_paise=item.unit_price_paise,
                discount_paise=item.discount_paise,
                tax_rate_bp=item.tax_rate_bp,
                tax_inclusive=False,
            )
            tax_res = compute_line(line_in, intra_state=intra_state, charge_tax=charge_tax)
            InvoiceLine.objects.create(
                shop=locked_job.shop,
                invoice=invoice,
                position=pos,
                description=item.description,
                hsn_sac=item.hsn_sac or "",
                quantity=item.quantity,
                unit_price_paise=item.unit_price_paise,
                discount_paise=item.discount_paise,
                tax_inclusive=False,
                tax_rate_bp=item.tax_rate_bp,
                taxable_paise=tax_res.taxable_paise,
                cgst_paise=tax_res.cgst_paise,
                sgst_paise=tax_res.sgst_paise,
                igst_paise=tax_res.igst_paise,
                line_total_paise=tax_res.line_total_paise,
            )

        recalculate_invoice_totals(invoice)

        record_audit(
            action="invoice.draft_created",
            entity=invoice,
            actor=actor,
            shop=locked_job.shop,
            request=request,
            after={"job_id": str(locked_job.id), "total_paise": invoice.total_paise},
        )
        return invoice


def recalculate_invoice_totals(invoice: Invoice) -> Invoice:
    """
    Recalculates all line tax components and invoice total amounts.
    Satisfies check constraint: total_paise = taxable + cgst + sgst + igst + round_off.
    """
    lines = list(invoice.lines.filter(deleted_at__isnull=True).order_by("position", "created_at"))
    intra_state = is_intra_state(
        shop_state_code=invoice.shop.state_code,
        customer_gstin=invoice.customer_gstin,
        place_of_supply_state=invoice.place_of_supply_state,
    )
    charge_tax = invoice.kind == Invoice.Kind.TAX_INVOICE

    subtotal_paise = 0
    discount_paise = 0
    taxable_paise = 0
    cgst_paise = 0
    sgst_paise = 0
    igst_paise = 0

    for line in lines:
        line_in = LineInput(
            quantity=line.quantity,
            unit_price_paise=line.unit_price_paise,
            discount_paise=line.discount_paise,
            tax_rate_bp=line.tax_rate_bp,
            tax_inclusive=line.tax_inclusive,
        )
        tax_res = compute_line(line_in, intra_state=intra_state, charge_tax=charge_tax)

        line.taxable_paise = tax_res.taxable_paise
        line.cgst_paise = tax_res.cgst_paise
        line.sgst_paise = tax_res.sgst_paise
        line.igst_paise = tax_res.igst_paise
        line.line_total_paise = tax_res.line_total_paise
        line.save(
            update_fields=[
                "taxable_paise",
                "cgst_paise",
                "sgst_paise",
                "igst_paise",
                "line_total_paise",
                "updated_at",
            ]
        )

        subtotal_paise += mul_qty(line.unit_price_paise, line.quantity)
        discount_paise += line.discount_paise
        taxable_paise += tax_res.taxable_paise
        cgst_paise += tax_res.cgst_paise
        sgst_paise += tax_res.sgst_paise
        igst_paise += tax_res.igst_paise

    pre_round_total = taxable_paise + cgst_paise + sgst_paise + igst_paise
    round_off_paise = round_off(pre_round_total, invoice.shop.round_off_enabled)
    total_paise = pre_round_total + round_off_paise

    invoice.subtotal_paise = subtotal_paise
    invoice.discount_paise = discount_paise
    invoice.taxable_paise = taxable_paise
    invoice.cgst_paise = cgst_paise
    invoice.sgst_paise = sgst_paise
    invoice.igst_paise = igst_paise
    invoice.round_off_paise = round_off_paise
    invoice.total_paise = total_paise
    invoice.save(
        update_fields=[
            "subtotal_paise",
            "discount_paise",
            "taxable_paise",
            "cgst_paise",
            "sgst_paise",
            "igst_paise",
            "round_off_paise",
            "total_paise",
            "updated_at",
        ]
    )
    return invoice


def issue_invoice(*, invoice: Invoice, actor, request=None) -> Invoice:
    """
    Issues an immutable invoice.
    Assigns sequential number, freezes shop & customer snapshots,
    links previous payments from the job, and updates amount_paid_paise.
    """
    if invoice.status != Invoice.Status.DRAFT:
        raise ConflictError("Invoice is already issued.", code="invoice.already_issued")

    lines = invoice.lines.filter(deleted_at__isnull=True)
    if not lines.exists():
        raise DomainError("Invoice must have at least one line item.", code="invoice.empty", status=422)

    with transaction.atomic():
        locked_invoice = Invoice.objects.select_for_update().get(id=invoice.id, shop=invoice.shop)
        if locked_invoice.status != Invoice.Status.DRAFT:
            raise ConflictError("Invoice is already issued.", code="invoice.already_issued")

        recalculate_invoice_totals(locked_invoice)

        today = today_ist()
        series, last_num, display = next_invoice_number(
            shop=locked_invoice.shop,
            kind=locked_invoice.kind,
            issue_date=today,
        )

        locked_invoice.series = series
        locked_invoice.number = last_num
        locked_invoice.number_display = display
        locked_invoice.issue_date = today

        # Snapshots
        shop = locked_invoice.shop
        locked_invoice.shop_snapshot = {
            "name": shop.name,
            "phone": shop.phone,
            "address_line1": shop.address_line1,
            "address_line2": shop.address_line2,
            "city": shop.city,
            "state_code": shop.state_code,
            "pincode": shop.pincode,
            "gstin": shop.gstin or "",
            "upi_id": shop.upi_id or "",
            "logo_key": shop.logo_key or "",
        }

        cust = locked_invoice.customer
        locked_invoice.customer_snapshot = {
            "name": cust.name if cust else "",
            "phone": cust.phone if cust else "",
            "address": cust.address if cust else "",
            "gstin": locked_invoice.customer_gstin or "",
        }

        # Link job payments
        if locked_invoice.job:
            job_payments = locked_invoice.job.payments.filter(deleted_at__isnull=True)
            job_payments.filter(invoice__isnull=True).update(invoice=locked_invoice)
            inn = (
                locked_invoice.payments.filter(direction=Payment.Direction.IN).aggregate(Sum("amount_paise"))[
                    "amount_paise__sum"
                ]
                or 0
            )
            out = (
                locked_invoice.payments.filter(direction=Payment.Direction.OUT).aggregate(Sum("amount_paise"))[
                    "amount_paise__sum"
                ]
                or 0
            )
            locked_invoice.amount_paid_paise = max(0, inn - out)

        locked_invoice.status = Invoice.Status.ISSUED
        locked_invoice.issued_by = actor
        locked_invoice.issued_at = timezone.now()
        locked_invoice.save()

        record_audit(
            action="invoice.issued",
            entity=locked_invoice,
            actor=actor,
            shop=locked_invoice.shop,
            request=request,
            after={
                "number_display": locked_invoice.number_display,
                "total_paise": locked_invoice.total_paise,
                "amount_paid_paise": locked_invoice.amount_paid_paise,
            },
        )
        return locked_invoice


def cancel_invoice(*, invoice: Invoice, actor, reason: str, request=None) -> tuple[Invoice, Invoice]:
    """
    Cancels an issued invoice and automatically generates/issues a compensating credit note.
    Once cancelled, the original job can receive a new draft invoice.
    """
    if invoice.status != Invoice.Status.ISSUED:
        raise ConflictError("Only issued invoices can be cancelled.", code="invoice.not_issued")

    clean_reason = (reason or "").strip()
    if not clean_reason:
        raise DomainError("Cancellation reason is required.", code="invoice.cancel_reason_required", status=422)

    with transaction.atomic():
        locked_invoice = Invoice.objects.select_for_update().get(id=invoice.id, shop=invoice.shop)
        if locked_invoice.status != Invoice.Status.ISSUED:
            raise ConflictError("Only issued invoices can be cancelled.", code="invoice.not_issued")

        # 1. Cancel original
        locked_invoice.status = Invoice.Status.CANCELLED
        locked_invoice.cancelled_at = timezone.now()
        locked_invoice.cancel_reason = clean_reason
        locked_invoice.save(update_fields=["status", "cancelled_at", "cancel_reason", "updated_at", "version"])

        # 2. Create Credit Note
        today = today_ist()
        series, last_num, display = next_invoice_number(
            shop=locked_invoice.shop,
            kind="credit_note",
            issue_date=today,
        )

        credit_note = Invoice.objects.create(
            shop=locked_invoice.shop,
            job=locked_invoice.job,
            customer=locked_invoice.customer,
            kind=Invoice.Kind.CREDIT_NOTE,
            status=Invoice.Status.DRAFT,
            series=series,
            number=last_num,
            number_display=display,
            issue_date=today,
            original_invoice=locked_invoice,
            place_of_supply_state=locked_invoice.place_of_supply_state,
            customer_gstin=locked_invoice.customer_gstin,
            subtotal_paise=locked_invoice.subtotal_paise,
            discount_paise=locked_invoice.discount_paise,
            taxable_paise=locked_invoice.taxable_paise,
            cgst_paise=locked_invoice.cgst_paise,
            sgst_paise=locked_invoice.sgst_paise,
            igst_paise=locked_invoice.igst_paise,
            round_off_paise=locked_invoice.round_off_paise,
            total_paise=locked_invoice.total_paise,
            amount_paid_paise=0,
            shop_snapshot=locked_invoice.shop_snapshot,
            customer_snapshot=locked_invoice.customer_snapshot,
            notes=f"Credit note against {locked_invoice.number_display}. Reason: {clean_reason}",
            terms=locked_invoice.terms,
            issued_by=actor,
            issued_at=timezone.now(),
        )

        # Copy line items to credit note
        orig_lines = locked_invoice.lines.filter(deleted_at__isnull=True).order_by("position")
        for line in orig_lines:
            InvoiceLine.objects.create(
                shop=locked_invoice.shop,
                invoice=credit_note,
                position=line.position,
                description=line.description,
                hsn_sac=line.hsn_sac,
                quantity=line.quantity,
                unit_price_paise=line.unit_price_paise,
                discount_paise=line.discount_paise,
                tax_inclusive=line.tax_inclusive,
                tax_rate_bp=line.tax_rate_bp,
                taxable_paise=line.taxable_paise,
                cgst_paise=line.cgst_paise,
                sgst_paise=line.sgst_paise,
                igst_paise=line.igst_paise,
                line_total_paise=line.line_total_paise,
            )

        credit_note.status = Invoice.Status.ISSUED
        credit_note.save(update_fields=["status", "updated_at", "version"])

        record_audit(
            action="invoice.cancelled",
            entity=locked_invoice,
            actor=actor,
            shop=locked_invoice.shop,
            request=request,
            after={
                "credit_note_id": str(credit_note.id),
                "credit_note_number": credit_note.number_display,
                "reason": clean_reason,
            },
        )
        return locked_invoice, credit_note


def update_draft_invoice(*, invoice: Invoice, actor, data: dict, request=None) -> Invoice:
    """
    Updates an editable draft invoice.
    Can modify customer_gstin, place_of_supply_state, notes, terms, and lines.
    Rejects modification on issued or cancelled invoices.
    """
    if invoice.status != Invoice.Status.DRAFT:
        raise ConflictError("Issued invoices are immutable.", code="invoice.already_issued")

    with transaction.atomic():
        locked_invoice = Invoice.objects.select_for_update().get(id=invoice.id, shop=invoice.shop)
        if locked_invoice.status != Invoice.Status.DRAFT:
            raise ConflictError("Issued invoices are immutable.", code="invoice.already_issued")

        if "customer_gstin" in data:
            gstin = (data["customer_gstin"] or "").strip().upper()
            if gstin:
                validate_gstin(gstin)
            locked_invoice.customer_gstin = gstin

        if "place_of_supply_state" in data:
            pos_state = (data["place_of_supply_state"] or "").strip()
            if pos_state:
                validate_state_code(pos_state)
            locked_invoice.place_of_supply_state = pos_state

        if "notes" in data:
            locked_invoice.notes = data["notes"] or ""

        if "terms" in data:
            locked_invoice.terms = data["terms"] or ""

        locked_invoice.save(
            update_fields=[
                "customer_gstin",
                "place_of_supply_state",
                "notes",
                "terms",
                "updated_at",
            ]
        )

        if "lines" in data:
            # Replace lines
            locked_invoice.lines.all().delete()
            lines_data = data["lines"]
            for idx, line_dict in enumerate(lines_data):
                InvoiceLine.objects.create(
                    shop=locked_invoice.shop,
                    invoice=locked_invoice,
                    position=idx,
                    description=line_dict["description"],
                    hsn_sac=line_dict.get("hsn_sac", "") or "",
                    quantity=Decimal(str(line_dict.get("quantity", 1))),
                    unit_price_paise=int(line_dict.get("unit_price_paise", 0)),
                    discount_paise=int(line_dict.get("discount_paise", 0)),
                    tax_inclusive=bool(line_dict.get("tax_inclusive", False)),
                    tax_rate_bp=int(line_dict.get("tax_rate_bp", 0)),
                )

        recalculate_invoice_totals(locked_invoice)

        record_audit(
            action="invoice.draft_updated",
            entity=locked_invoice,
            actor=actor,
            shop=locked_invoice.shop,
            request=request,
            after=snapshot(locked_invoice, ("total_paise", "customer_gstin", "place_of_supply_state")),
        )
        return locked_invoice


def delete_draft_invoice(*, invoice: Invoice, actor, request=None):
    """
    Soft-deletes a draft invoice.
    Rejects deletion on issued or cancelled invoices.
    """
    if invoice.status != Invoice.Status.DRAFT:
        raise ConflictError("Issued invoices are immutable.", code="invoice.already_issued")

    with transaction.atomic():
        locked_invoice = Invoice.objects.select_for_update().get(id=invoice.id, shop=invoice.shop)
        if locked_invoice.status != Invoice.Status.DRAFT:
            raise ConflictError("Issued invoices are immutable.", code="invoice.already_issued")

        locked_invoice.soft_delete()
        record_audit(
            action="invoice.deleted",
            entity=locked_invoice,
            actor=actor,
            shop=locked_invoice.shop,
            request=request,
        )
