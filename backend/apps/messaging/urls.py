from rest_framework.routers import DefaultRouter

from apps.messaging.views import MessageTemplateViewSet

router = DefaultRouter()
router.register(r"message-templates", MessageTemplateViewSet, basename="message-templates")

urlpatterns = router.urls
