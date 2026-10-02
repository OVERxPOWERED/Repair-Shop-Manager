"""
Views for tenancy management, shop onboarding, and staff membership.
"""

from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.tenancy.models import Membership, Role, Shop
from apps.tenancy.scoping import ShopScopedViewSet
from apps.tenancy.serializers import (
    MembershipSerializer,
    OnboardShopSerializer,
    RoleSerializer,
    ShopSerializer,
)
from apps.tenancy.services import create_organization_and_shop, seed_system_roles


class OnboardShopView(APIView):
    """
    Onboard the current user by creating their organization and first repair shop.
    Assigns the current user as the Owner of the shop.
    """

    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(
        summary="Onboard New Shop & Organization",
        description="Creates organization and initial shop branch with Owner membership for authenticated user.",
        request=OnboardShopSerializer,
        responses={201: dict, 400: dict},
    )
    def post(self, request):
        serializer = OnboardShopSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        org, shop, membership = create_organization_and_shop(
            owner_user=request.user,
            org_name=data.get("organization_name") or data["shop_name"],
            shop_name=data["shop_name"],
            shop_type=data.get("shop_type", Shop.ShopTypeChoices.MOBILE),
            phone=data.get("phone", ""),
            address_line1=data.get("address_line1", ""),
            city=data.get("city", ""),
            pincode=data.get("pincode", ""),
            state_code=data.get("state_code", ""),
            gst_enabled=data.get("gst_enabled", False),
            gstin=data.get("gstin"),
            upi_id=data.get("upi_id"),
        )

        return Response(
            {
                "data": {
                    "organization_id": str(org.id),
                    "shop": ShopSerializer(shop).data,
                    "membership": MembershipSerializer(membership).data,
                }
            },
            status=status.HTTP_201_CREATED,
        )


class ShopViewSet(viewsets.ModelViewSet):
    """
    Manage shops.
    Listing returns all shops where the authenticated user has an active membership.
    Detail retrieval and updates require active membership in that specific shop.
    """

    serializer_class = ShopSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        if getattr(self.request.user, "is_platform_admin", False):
            return Shop.objects.alive()
        # Return only shops where user is an active member
        return Shop.objects.filter(
            memberships__user=self.request.user, memberships__status="active", deleted_at__isnull=True
        ).distinct()


class RoleViewSet(viewsets.ReadOnlyModelViewSet):
    """
    List available roles (system defaults and organization custom roles).
    """

    serializer_class = RoleSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        seed_system_roles()
        return Role.objects.filter(is_system=True)


class StaffMembershipViewSet(ShopScopedViewSet):
    """
    Manage shop staff members. Scoped by X-Shop-Id.
    Requires 'staff.view' for reading and 'staff.manage' for editing.
    """

    serializer_class = MembershipSerializer
    required_permission = "staff.view"

    def get_queryset(self):
        # In ShopScopedViewSet, request.shop is verified
        return (
            Membership.objects.filter(shop=self.request.shop, status__in=["active", "suspended", "invited"])
            .select_related("user", "role")
            .order_by("-joined_at")
        )

    def perform_create(self, serializer):
        # Handled through Invites rather than direct membership creation
        pass
