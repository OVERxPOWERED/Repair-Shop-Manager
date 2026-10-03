"""
Sequential numbering service for invoices, credit notes, and bills of supply.
Handles financial year rollover, prefixing, and concurrency locking.
"""

from datetime import date

from django.db import IntegrityError, transaction

from apps.billing.models import InvoiceSeries
from apps.core.api.errors import DomainError
from apps.core.time import financial_year_label, financial_year_start


def next_invoice_number(shop, kind: str, issue_date: date) -> tuple[InvoiceSeries, int, str]:
    """
    Allocates the next sequential number for an invoice, credit note, or bill of supply.
    Runs inside a row-level lock (select_for_update) to prevent duplicates or race conditions.
    Formats as: {prefix}/{fy_label}/{number:05d} (e.g. 'INV/26-27/00001').
    Enforces the 16-character GST limit on invoice numbers.
    TODO(verify) format limits and requirements with the CA.
    """
    fy = financial_year_start(issue_date)
    series_kind = {
        "credit_note": InvoiceSeries.Kind.CREDIT_NOTE,
        "bill_of_supply": InvoiceSeries.Kind.BILL_OF_SUPPLY,
    }.get(kind, InvoiceSeries.Kind.INVOICE)

    prefix_map = {
        InvoiceSeries.Kind.INVOICE: shop.invoice_prefix or "INV",
        InvoiceSeries.Kind.CREDIT_NOTE: "CN",
        InvoiceSeries.Kind.BILL_OF_SUPPLY: "BOS",
    }
    prefix = prefix_map[series_kind]

    with transaction.atomic():
        try:
            series, _ = InvoiceSeries.objects.get_or_create(
                shop=shop,
                kind=series_kind,
                fy_start_year=fy,
                defaults={"prefix": prefix},
            )
        except IntegrityError:
            series = InvoiceSeries.objects.get(
                shop=shop,
                kind=series_kind,
                fy_start_year=fy,
            )

        series = InvoiceSeries.objects.select_for_update().get(pk=series.pk)
        series.last_number += 1
        series.save(update_fields=["last_number", "updated_at"])

        display = f"{series.prefix}/{financial_year_label(fy)}/{series.last_number:05d}"
        if len(display) > 16:  # GST rule believed to limit invoice numbers to 16 characters. TODO(verify)
            raise DomainError(
                "Invoice number exceeds 16 characters limit.",
                code="invoice.number_too_long",
                status=422,
            )

        return series, series.last_number, display
