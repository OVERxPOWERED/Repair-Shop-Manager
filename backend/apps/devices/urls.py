from rest_framework.routers import DefaultRouter

from apps.devices.views import DeviceViewSet

router = DefaultRouter()
router.register("devices", DeviceViewSet, basename="device")

urlpatterns = router.urls
