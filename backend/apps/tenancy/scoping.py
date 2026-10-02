"""
Tenant scoping layer for FixPro.
Enforces multi-tenant isolation across all models, querysets, viewsets, and requests.
Rule 1: Never write a raw unscoped query for business data.
"""

import uuid

from django.utils.deprecation import MiddlewareMixin
from rest_framework import viewsets

from apps.core.api.errors import DomainError, NotFoundError
from apps.tenancy.models import Membership, Shop


class TenantScopingMiddleware(MiddlewareMixin):
    """
    Middleware that inspects 'X-Shop-Id' header on API requests.
    Validates tenant context and attaches request.shop and request.membership.
    """

    def process_request(self, request):
        request.shop = None
        request.membership = None

        shop_id_raw = request.headers.get("X-Shop-Id") or request.META.get("HTTP_X_SHOP_ID")
        if not shop_id_raw:
            return

        try:
            shop_id = uuid.UUID(str(shop_id_raw).strip())
        except (ValueError, TypeError, AttributeError):
            return

        # Verify shop exists and is not soft-deleted
        try:
            shop = Shop.objects.get(id=shop_id, deleted_at__isnull=True)
            request.shop = shop
        except Shop.DoesNotExist:
            return

        # If user is authenticated, resolve their active membership
        if request.user and request.user.is_authenticated:
            membership = (
                Membership.objects.filter(user=request.user, shop=shop, status="active")
                .select_related("role", "shop")
                .first()
            )
            request.membership = membership

        return


class ShopScopedViewSet(viewsets.ModelViewSet):
    """
    Base ModelViewSet for all shop-scoped business resources (jobs, customers, devices, invoices).
    Enforces:
    1. Mandatory X-Shop-Id header.
    2. Verified active membership for the requesting user.
    3. Strict queryset filtering (shop_id = request.shop.id).
    4. Automatic injection of shop_id and created_by_id during create.
    """

    required_permission: str | None = None

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)

        # 1. Require X-Shop-Id header
        shop_id_raw = request.headers.get("X-Shop-Id") or request.META.get("HTTP_X_SHOP_ID")
        if not shop_id_raw:
            raise DomainError("Header 'X-Shop-Id' is required.", code="shop.header_missing", status=400)

        try:
            shop_uuid = uuid.UUID(str(shop_id_raw).strip())
        except (ValueError, TypeError) as err:
            raise DomainError("Header 'X-Shop-Id' must be a UUID.", code="shop.header_invalid", status=400) from err

        # 2. Resolve shop
        try:
            shop = Shop.objects.get(id=shop_uuid, deleted_at__isnull=True)
            request.shop = shop
        except Shop.DoesNotExist as err:
            raise NotFoundError("Shop not found.", code="shop.not_found") from err

        # Platform admins bypass membership check
        if getattr(request.user, "is_platform_admin", False):
            request.membership = None
            return

        membership = (
            Membership.objects.filter(user=request.user, shop=shop, status="active")
            .select_related("role", "shop")
            .first()
        )

        if not membership:
            raise NotFoundError("Shop not found.", code="shop.not_found")

        request.membership = membership

        # 4. Check specific permission if view requires one
        if (
            self.required_permission
            and membership.role.name != "Owner"
            and self.required_permission not in membership.role.permissions
        ):
            raise DomainError("You do not have permission to do this.", code="permission.denied", status=403)

    def get_queryset(self):
        """
        Guarantees that querysets are strictly filtered by the verified tenant shop_id.
        """
        qs = super().get_queryset()
        if hasattr(self.request, "shop") and self.request.shop:
            return qs.filter(shop_id=self.request.shop.id)
        return qs.none()

    def perform_create(self, serializer):
        """
        Automatically attaches tenant shop_id and author user ID to newly created records.
        """
        serializer.save(shop_id=self.request.shop.id, created_by_id=self.request.user.id)
