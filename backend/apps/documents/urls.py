from django.urls import path

from apps.documents.views import InvoicePdfView, JobReceiptPdfView

urlpatterns = [
    path("invoices/<uuid:pk>/pdf/", InvoicePdfView.as_view(), name="invoice-pdf"),
    path("jobs/<uuid:pk>/receipt.pdf", JobReceiptPdfView.as_view(), name="job-receipt-pdf"),
]
