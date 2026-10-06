import contextlib

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import IntegrityError, transaction
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.serializers import my_shops
from apps.audit.services import record_audit, snapshot
from apps.core.api.concurrency import save_with_version
from apps.core.api.errors import DomainError, NotFoundError
from apps.core.api.idempotency import idempotent
from apps.core.images import normalise_photo
from apps.tenancy import invites as invite_service
from apps.tenancy import join_code as join_code_service
from apps.tenancy import staff as staff_service
from apps.tenancy.models import AccessoryOption, Invite, Membership, Role, ShopBrand
from apps.tenancy.permissions import ANY_MEMBER
from apps.tenancy.serializers import (
    AccessoryOptionSerializer,
    ApproveJoinRequestSerializer,
    AssignableStaffSerializer,
    ChangeRoleSerializer,
    ConfigureJoinCodeSerializer,
    CreateInviteSerializer,
    InviteSerializer,
    JoinRequestItemSerializer,
    JoinShopRequestSerializer,
    JoinShopResponseSerializer,
    MembershipSerializer,
    MyInviteSerializer,
    OnboardShopSerializer,
    RoleSerializer,
    ShopBrandSerializer,
    ShopJoinCodeSerializer,
    ShopSerializer,
)
from apps.tenancy.services import create_organization_and_shop
from apps.tenancy.viewsets import ShopScopedAPIView, ShopScopedMixin, ShopScopedViewSet


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


class ShopLogoView(ShopScopedAPIView):
    """POST /shops/current/logo/ (multipart, shop.settings)."""

    http_method_names = ["post", "head", "options"]
    parser_classes = (MultiPartParser, FormParser)
    permission_map = {"post": "shop.settings"}

    @extend_schema(request=None, responses=ShopSerializer)
    def post(self, request):
        file = request.FILES.get("file") or request.FILES.get("logo")
        if not file:
            raise DomainError("A logo image file is required.", code="upload.missing_file", status=400)

        content_bytes, width, height = normalise_photo(file, max_side=512, allow_png=True)
        ext = "png" if content_bytes.startswith(b"\x89PNG\r\n\x1a\n") else "jpg"
        key = f"shops/{request.shop.id}/logo.{ext}"

        if request.shop.logo_key and request.shop.logo_key != key:
            with contextlib.suppress(Exception):
                default_storage.delete(request.shop.logo_key)

        default_storage.save(key, ContentFile(content_bytes))
        before = snapshot(request.shop, ("logo_key", "version"))
        request.shop.logo_key = key
        request.shop.version += 1
        request.shop.save(update_fields=["logo_key", "version", "updated_at"])
        after = snapshot(request.shop, ("logo_key", "version"))

        record_audit(
            action="shop.logo_updated",
            entity=request.shop,
            request=request,
            before=before,
            after=after,
        )
        return Response(ShopSerializer(request.shop).data)


class RoleViewSet(ShopScopedMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = RoleSerializer
    permission_map = {"list": "staff.view", "retrieve": "staff.view"}

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Role.objects.none()
        return staff_service.assignable_roles(self.request.shop).order_by("name")


class ShopBrandViewSet(ShopScopedViewSet):
    queryset = ShopBrand.objects.all()
    serializer_class = ShopBrandSerializer
    permission_map = {
        "list": "jobs.view",
        "retrieve": "jobs.view",
        "create": "shop.settings",
        "update": "shop.settings",
        "partial_update": "shop.settings",
        "destroy": "shop.settings",
    }
    filterset_fields = ["device_category", "is_active"]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def perform_create(self, serializer):
        try:
            with transaction.atomic():
                super().perform_create(serializer)
        except IntegrityError as err:
            raise serializers.ValidationError({"name": ["Already exists"]}) from err

    def perform_update(self, serializer):
        try:
            with transaction.atomic():
                super().perform_update(serializer)
        except IntegrityError as err:
            raise serializers.ValidationError({"name": ["Already exists"]}) from err


class AccessoryOptionViewSet(ShopScopedViewSet):
    queryset = AccessoryOption.objects.all()
    serializer_class = AccessoryOptionSerializer
    permission_map = {
        "list": "jobs.view",
        "retrieve": "jobs.view",
        "create": "shop.settings",
        "update": "shop.settings",
        "partial_update": "shop.settings",
        "destroy": "shop.settings",
    }
    filterset_fields = ["is_default"]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]


class StaffViewSet(ShopScopedMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = MembershipSerializer
    permission_map = {
        "list": "staff.view",
        "retrieve": "staff.view",
        "change_role": "staff.manage",
        "suspend": "staff.manage",
        "reactivate": "staff.manage",
        "remove": "staff.manage",
        "assignable": "jobs.create",
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

    @extend_schema(responses={200: AssignableStaffSerializer(many=True)})
    @action(detail=False, methods=["get"], url_path="assignable")
    def assignable(self, request):
        members = (
            Membership.objects.filter(shop=request.shop, status=Membership.StatusChoices.ACTIVE)
            .select_related("user", "role")
            .order_by("user__name", "user__phone")
        )
        assignable_members = [m for m in members if m.has_perm("jobs.change_status")]
        return Response(AssignableStaffSerializer(assignable_members, many=True).data)

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


class ShopJoinCodeView(ShopScopedAPIView):
    permission_map = {"get": "staff.manage", "post": "staff.manage"}

    @extend_schema(responses={200: ShopJoinCodeSerializer}, summary="Get shop master join code")
    def get(self, request):
        if not request.shop.join_code:
            join_code_service.configure_join_code(request.shop, duration="7d")
        return Response(ShopJoinCodeSerializer(request.shop).data)

    @extend_schema(
        request=ConfigureJoinCodeSerializer,
        responses={200: ShopJoinCodeSerializer},
        summary="Configure master join code",
    )
    def post(self, request):
        s = ConfigureJoinCodeSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        shop = join_code_service.configure_join_code(request.shop, **s.validated_data)
        record_audit(
            action="staff.join_code_updated",
            entity=shop,
            request=request,
            actor=request.user,
            shop=request.shop,
            after={"join_code": shop.join_code, "expires_at": str(shop.join_code_expires_at)},
        )
        return Response(ShopJoinCodeSerializer(shop).data)


class JoinShopView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(
        request=JoinShopRequestSerializer,
        responses={201: JoinShopResponseSerializer},
        summary="Request to join shop via join code",
    )
    def post(self, request):
        s = JoinShopRequestSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        membership = join_code_service.request_join_with_code(request.user, s.validated_data["code"])
        record_audit(
            action="staff.join_requested",
            entity=membership,
            request=request,
            actor=request.user,
            shop=membership.shop,
            after={"code": s.validated_data["code"].upper()},
        )
        return Response(JoinShopResponseSerializer(membership).data, status=status.HTTP_201_CREATED)


class JoinRequestsViewSet(ShopScopedMixin, viewsets.GenericViewSet):
    permission_map = {
        "list": "staff.manage",
        "approve": "staff.manage",
        "reject": "staff.manage",
    }

    @extend_schema(responses={200: JoinRequestItemSerializer(many=True)}, summary="List pending join requests")
    def list(self, request):
        qs = (
            Membership.objects.filter(shop=request.shop, status=Membership.StatusChoices.REQUESTED)
            .select_related("user")
            .order_by("-created_at")
        )
        return Response(JoinRequestItemSerializer(qs, many=True).data)

    @extend_schema(
        request=ApproveJoinRequestSerializer,
        responses={200: JoinRequestItemSerializer},
        summary="Approve join request and assign role",
    )
    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        s = ApproveJoinRequestSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        membership = join_code_service.approve_join_request(
            actor=request.membership,
            membership_id=pk,
            role_id=s.validated_data["role_id"],
        )
        record_audit(
            action="staff.request_approved",
            entity=membership,
            request=request,
            actor=request.user,
            shop=request.shop,
            after={"role_id": str(membership.role_id), "user_id": str(membership.user_id)},
        )
        return Response(JoinRequestItemSerializer(membership).data)

    @extend_schema(responses={204: None}, summary="Reject join request")
    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        membership = join_code_service.reject_join_request(actor=request.membership, membership_id=pk)
        record_audit(
            action="staff.request_rejected",
            entity=membership,
            request=request,
            actor=request.user,
            shop=request.shop,
            after={"user_id": str(membership.user_id)},
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
