from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.core.api.concurrency import VersionedUpdateMixin
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

    def get_required_permission(self) -> str | None:
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

    def get_queryset(self):
        qs = super().get_queryset()
        if getattr(self, "swagger_fake_view", False):
            return qs.none()
        return qs.filter(shop=self.request.shop)

    def perform_create(self, serializer):
        serializer.save(shop=self.request.shop, created_by=self.request.user)

    def perform_destroy(self, instance):
        instance.soft_delete()


class ShopScopedAPIView(ShopScopedMixin, APIView):
    """For non-CRUD endpoints. permission_map is keyed by HTTP method: {"get": ..., "post": ...}."""
