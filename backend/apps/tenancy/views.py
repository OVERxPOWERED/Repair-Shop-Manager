from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.serializers import my_shops
from apps.audit.services import record_audit, snapshot
from apps.core.api.concurrency import save_with_version
from apps.core.api.errors import DomainError, NotFoundError
from apps.core.api.idempotency import idempotent
from apps.tenancy import invites as invite_service
from apps.tenancy import staff as staff_service
from apps.tenancy.models import Invite, Membership, Role
from apps.tenancy.permissions import ANY_MEMBER
from apps.tenancy.serializers import (
    ChangeRoleSerializer,
    CreateInviteSerializer,
    InviteSerializer,
    MembershipSerializer,
    MyInviteSerializer,
    OnboardShopSerializer,
    RoleSerializer,
    ShopSerializer,
)
from apps.tenancy.services import create_organization_and_shop
from apps.tenancy.viewsets import ShopScopedAPIView, ShopScopedMixin


class OnboardShopView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(request=OnboardShopSerializer, responses={201: dict})
    @idempotent(required=False)
    def post(self, request):
        s = OnboardShopSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        data = dict(s.validated_data)
        org_name = data.pop("organization_name", "") or data["name"]
        _org, shop, _membership = create_organization_and_shop(
            owner_user=request.user,
            org_name=org_name,
            shop_name=data.pop("name"),
            shop_type=data.pop("shop_type", "mobile"),
            phone=data.pop("phone", ""),
            **data,
        )
        record_audit(
            action="shop.created",
            entity=shop,
            request=request,
            actor=request.user,
            shop=shop,
            after={"name": shop.name, "shop_type": shop.shop_type, "gst_enabled": shop.gst_enabled},
        )
        return Response({"shop": ShopSerializer(shop).data, "shops": my_shops(request.user)}, status=201)


class MyShopsView(APIView):
    """GET /shops/: every shop the caller is an active member of. No X-Shop-Id needed."""

    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(responses={200: dict})
    def get(self, request):
        return Response(my_shops(request.user))


class CurrentShopView(ShopScopedAPIView):
    """GET/PATCH /shops/current/ (the shop named in X-Shop-Id)."""

    http_method_names = ["get", "patch", "head", "options"]
    permission_map = {"get": ANY_MEMBER, "patch": "shop.settings"}

    @extend_schema(responses=ShopSerializer)
    def get(self, request):
        return Response(ShopSerializer(request.shop).data)

    @extend_schema(request=ShopSerializer, responses=ShopSerializer)
    def patch(self, request):
        before = snapshot(request.shop, ShopSerializer.Meta.fields)
        s = ShopSerializer(request.shop, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        shop = save_with_version(request, s)
        after = snapshot(shop, ShopSerializer.Meta.fields)
        record_audit(
            action="shop.settings_updated",
            entity=shop,
            request=request,
            before=before,
            after=after,
        )
        return Response(ShopSerializer(shop).data)


class RoleViewSet(ShopScopedMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = RoleSerializer
    permission_map = {"list": "staff.view", "retrieve": "staff.view"}

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Role.objects.none()
        return staff_service.assignable_roles(self.request.shop).order_by("name")


class StaffViewSet(ShopScopedMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = MembershipSerializer
    permission_map = {
        "list": "staff.view",
        "retrieve": "staff.view",
        "change_role": "staff.manage",
        "suspend": "staff.manage",
        "reactivate": "staff.manage",
        "remove": "staff.manage",
    }

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Membership.objects.none()
        return (
            Membership.objects.filter(shop=self.request.shop)
            .exclude(status=Membership.StatusChoices.REMOVED)
            .select_related("user", "role", "shop__organization")
            .order_by("-joined_at")
        )

    @extend_schema(request=ChangeRoleSerializer, responses=MembershipSerializer)
    @action(detail=True, methods=["post"], url_path="role")
    def change_role(self, request, pk=None):
        target = self.get_object()
        old_role_id = str(target.role_id)
        s = ChangeRoleSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        role = staff_service.assignable_roles(request.shop).filter(pk=s.validated_data["role_id"]).first()
        if role is None:
            raise DomainError("Unknown role.", code="staff.role_invalid", status=400)
        staff_service.change_role(actor=request.membership, target=target, role=role)
        record_audit(
            action="staff.role_changed",
            entity=target,
            request=request,
            before={"role_id": old_role_id},
            after={"role_id": str(role.id)},
        )
        return Response(MembershipSerializer(target).data)

    def _set_status(self, request, new_status):
        target = self.get_object()
        old_status = target.status
        staff_service.set_status(actor=request.membership, target=target, status=new_status)
        record_audit(
            action="staff.status_changed",
            entity=target,
            request=request,
            before={"status": old_status},
            after={"status": new_status},
        )
        return Response(MembershipSerializer(target).data)

    @extend_schema(request=None, responses=MembershipSerializer)
    @action(detail=True, methods=["post"])
    def suspend(self, request, pk=None):
        return self._set_status(request, Membership.StatusChoices.SUSPENDED)

    @extend_schema(request=None, responses=MembershipSerializer)
    @action(detail=True, methods=["post"])
    def reactivate(self, request, pk=None):
        return self._set_status(request, Membership.StatusChoices.ACTIVE)

    @extend_schema(request=None, responses={204: None})
    @action(detail=True, methods=["post"])
    def remove(self, request, pk=None):
        self._set_status(request, Membership.StatusChoices.REMOVED)
        return Response(status=status.HTTP_204_NO_CONTENT)


class InviteViewSet(ShopScopedMixin, viewsets.GenericViewSet):
    serializer_class = InviteSerializer
    permission_map = {
        "list": "staff.view",
        "create": "staff.manage",
        "destroy": "staff.manage",
    }

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Invite.objects.none()
        return (
            Invite.objects.filter(
                shop=self.request.shop,
                accepted_at__isnull=True,
                revoked_at__isnull=True,
                expires_at__gt=timezone.now(),
            )
            .select_related("role", "invited_by")
            .order_by("-created_at")
        )

    @extend_schema(responses={200: InviteSerializer(many=True)})
    def list(self, request):
        qs = self.get_queryset()
        return Response(InviteSerializer(qs, many=True).data)

    @extend_schema(request=CreateInviteSerializer, responses={201: InviteSerializer})
    @idempotent(required=False)
    def create(self, request):
        s = CreateInviteSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        phone = s.validated_data["phone"]
        role = staff_service.assignable_roles(request.shop).filter(pk=s.validated_data["role_id"]).first()
        if role is None:
            raise DomainError("Unknown role.", code="staff.role_invalid", status=400)
        invite = invite_service.create_invite(actor=request.membership, phone=phone, role=role)
        record_audit(
            action="staff.invited",
            entity=invite,
            request=request,
            actor=request.user,
            shop=request.shop,
            after={"phone": invite.phone, "role_id": str(invite.role_id)},
        )
        return Response(InviteSerializer(invite).data, status=status.HTTP_201_CREATED)

    @extend_schema(responses={204: None})
    def destroy(self, request, pk=None):
        invite = Invite.objects.filter(
            shop=request.shop,
            pk=pk,
            accepted_at__isnull=True,
            revoked_at__isnull=True,
        ).first()
        if invite is None:
            raise NotFoundError("Invite not found or already processed.", code="invite.not_found")
        invite.revoked_at = timezone.now()
        invite.save(update_fields=["revoked_at", "updated_at"])
        record_audit(
            action="staff.invite_revoked",
            entity=invite,
            request=request,
            actor=request.user,
            shop=request.shop,
            after={"phone": invite.phone},
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class MyInvitesListView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(responses={200: MyInviteSerializer(many=True)}, summary="Pending invites for current user")
    def get(self, request):
        invites = invite_service.pending_invites_for_phone(request.user.phone).order_by("-created_at")
        return Response(MyInviteSerializer(invites, many=True).data)


class AcceptInviteView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(responses={200: dict}, summary="Accept a shop invite")
    def post(self, request, id):
        membership = invite_service.accept_invite(user=request.user, invite_id=id)
        record_audit(
            action="staff.invite_accepted",
            entity=membership,
            request=request,
            actor=request.user,
            shop=membership.shop,
            after={"role_id": str(membership.role_id)},
        )
        return Response(my_shops(request.user))


class DeclineInviteView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(responses={204: None}, summary="Decline a shop invite")
    def post(self, request, id):
        invite_service.decline_invite(user=request.user, invite_id=id)
        return Response(status=status.HTTP_204_NO_CONTENT)
