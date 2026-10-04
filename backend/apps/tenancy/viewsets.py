from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit.services import record_audit
from apps.core.api.concurrency import VersionedUpdateMixin
from apps.core.api.errors import ConflictError
from apps.tenancy.permissions import HasShopPermission, IsShopMember


class ShopScopedMixin:
    """X-Shop-Id -> request.shop/membership, then permission_map[action] is required."""

    permission_classes = (IsAuthenticated, IsShopMember, HasShopPermission)
    permission_map: dict[str, str] = {}

    def initial(self, request, *args, **kwargs):
        from rest_framework import exceptions as drf_exceptions

        method = request.method.lower()
        if method not in self.http_method_names:
            raise drf_exceptions.MethodNotAllowed(request.method)
        if hasattr(self, "action_map") and self.action_map:
            if method not in self.action_map:
                raise drf_exceptions.MethodNotAllowed(request.method)
        elif not hasattr(self, method):
            raise drf_exceptions.MethodNotAllowed(request.method)
        super().initial(request, *args, **kwargs)

    def _in_trash_mode(self) -> bool:
        if getattr(self, "action", None) in ("restore", "destroy_permanent"):
            return True
        return getattr(self, "action", None) == "list" and self.request.query_params.get("deleted") == "true"

    def get_required_permission(self) -> str | None:
        if getattr(self, "action", None) == "list" and self._in_trash_mode():
            return self.permission_map.get("list_trash")
        key = getattr(self, "action", None) or self.request.method.lower()
        return self.permission_map.get(key)

    @property
    def shop(self):
        return self.request.shop

    @property
    def membership(self):
        return self.request.membership


class ShopScopedViewSet(ShopScopedMixin, VersionedUpdateMixin, viewsets.ModelViewSet):
    """CRUD for ShopScopedModel subclasses. Queryset is ALWAYS filtered by the current shop."""

    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        if hasattr(cls, "permission_map"):
            cls.permission_map = dict(cls.permission_map)
            cls.permission_map.setdefault("restore", None)
            cls.permission_map.setdefault("destroy_permanent", None)

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return self.queryset.none()
        model = self.queryset.model if self.queryset is not None else self.get_serializer_class().Meta.model
        if self._in_trash_mode():
            # Shop filter applies to BOTH branches. Only rows that are actually in trash.
            return model.all_objects.filter(shop=self.request.shop, deleted_at__isnull=False)
        return self.queryset.filter(shop=self.request.shop)

    def perform_create(self, serializer):
        serializer.save(shop=self.request.shop, created_by=self.request.user)

    def perform_destroy(self, instance):
        instance.soft_delete()

    @action(detail=True, methods=["post"])
    def restore(self, request, pk=None):
        obj = self.get_object()
        self.before_restore(obj)  # hook: raise ConflictError if restoring would break a rule
        obj.restore()
        record_audit(
            request=request,
            action=f"{obj._meta.model_name}.restored",
            entity=obj,
            shop=request.shop,
        )
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["delete"], url_path="permanent")
    def destroy_permanent(self, request, pk=None):
        obj = self.get_object()
        if not self.can_hard_delete(obj):  # hook, default False
            raise ConflictError("This record has financial history.", code="trash.has_financial_records")
        record_audit(
            request=request,
            action=f"{obj._meta.model_name}.deleted_permanently",
            entity=obj,
            shop=request.shop,
        )
        obj.hard_delete()
        return Response(status=204)

    def before_restore(self, obj):
        pass

    def can_hard_delete(self, obj) -> bool:
        return False


class ShopScopedAPIView(ShopScopedMixin, APIView):
    """For non-CRUD endpoints. permission_map is keyed by HTTP method: {"get": ..., "post": ...}."""
