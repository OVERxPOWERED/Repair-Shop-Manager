from django.urls import path

from apps.tracking import views

urlpatterns = [
    path("<str:token>/", views.tracking_page, name="tracking-page"),
    path("<str:token>/invoice.pdf", views.tracking_invoice_pdf, name="tracking-invoice-pdf"),
]
