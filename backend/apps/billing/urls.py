from rest_framework.routers import DefaultRouter

from apps.billing.views import InvoiceViewSet, PaymentViewSet

router = DefaultRouter()
router.register("payments", PaymentViewSet, basename="payment")
router.register("invoices", InvoiceViewSet, basename="invoice")

urlpatterns = router.urls
