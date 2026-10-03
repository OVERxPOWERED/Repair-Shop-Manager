from drf_spectacular.utils import extend_schema
from rest_framework import mixins, viewsets

from apps.audit.models import AuditLog
from apps.audit.serializers import AuditLogSerializer
from apps.tenancy.viewsets import ShopScopedMixin


@extend_schema(tags=["Audit Logs"])
class AuditLogViewSet(ShopScopedMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = AuditLogSerializer
    permission_map = {"list": "audit.view"}
    filterset_fields = ["action", "entity_type", "entity_id", "actor"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return AuditLog.objects.none()
        return AuditLog.objects.filter(shop=self.request.shop).select_related("actor").order_by("-created_at")
