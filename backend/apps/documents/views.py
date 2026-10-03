"""
Views for serving PDF documents (invoices, receipts).
"""

from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema

from apps.billing.models import Invoice
from apps.documents.services import invoice_pdf, job_receipt_pdf
from apps.jobs.models import Job
from apps.tenancy.viewsets import ShopScopedAPIView


@extend_schema(tags=["Documents"])
class InvoicePdfView(ShopScopedAPIView):
    permission_map = {
        "get": "invoices.print",
    }

    def get(self, request, pk=None):
        invoice = get_object_or_404(
            Invoice.objects.filter(shop=request.shop, deleted_at__isnull=True),
            pk=pk,
        )
        size = request.query_params.get("size", "a4")
        pdf_bytes = invoice_pdf(invoice, size=size)

        raw_name = invoice.number_display or f"INV-{invoice.id}"
        safe_name = raw_name.replace("/", "-")
        filename = f"{safe_name}.pdf"

        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="{filename}"'
        return response


@extend_schema(tags=["Documents"])
class JobReceiptPdfView(ShopScopedAPIView):
    permission_map = {
        "get": "jobs.view",
    }

    def get(self, request, pk=None):
        job = get_object_or_404(
            Job.objects.filter(shop=request.shop, deleted_at__isnull=True),
            pk=pk,
        )
        size = request.query_params.get("size", "a4")
        pdf_bytes = job_receipt_pdf(job, size=size)

        filename = f"JOB-{job.job_no}-receipt.pdf"

        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="{filename}"'
        return response
