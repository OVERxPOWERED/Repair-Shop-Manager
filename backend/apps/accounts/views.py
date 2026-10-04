from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenRefreshView

from apps.accounts.models import AccountDeletionRequest, UserDevice
from apps.accounts.serializers import (
    AccountDeletionRequestSerializer,
    CreateAccountDeletionRequestSerializer,
    DeviceSerializer,
    ProfileUpdateSerializer,
    SendOTPSerializer,
    UserSerializer,
    VerifyOTPSerializer,
    my_shops,
)
from apps.accounts.services import (
    OTP_COOLDOWN_SECONDS,
    cancel_account_deletion,
    logout_everywhere,
    request_account_deletion,
    revoke_device,
    send_otp,
    verify_otp_and_login,
)
from apps.accounts.tokens import DeviceAwareTokenRefreshSerializer
from apps.audit.services import record_audit
from apps.core.api.errors import NotFoundError
from apps.core.net import get_client_ip
from apps.tenancy.invites import pending_invites_for_phone


class SendOTPView(APIView):
    permission_classes = (permissions.AllowAny,)
    authentication_classes = ()
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "otp_send"

    @extend_schema(request=SendOTPSerializer, responses={200: dict}, summary="Request a login OTP")
    def post(self, request):
        s = SendOTPSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        challenge = send_otp(
            phone=s.validated_data["phone"],
            device_id=s.validated_data.get("device_id"),
            ip=get_client_ip(request),
        )
        return Response({"cooldown_seconds": OTP_COOLDOWN_SECONDS, "expires_at": challenge.expires_at})


class VerifyOTPView(APIView):
    permission_classes = (permissions.AllowAny,)
    authentication_classes = ()
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "otp_verify"

    @extend_schema(request=VerifyOTPSerializer, responses={200: dict}, summary="Verify OTP and sign in")
    def post(self, request):
        s = VerifyOTPSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        user, device, tokens, is_new_device = verify_otp_and_login(
            phone=d["phone"],
            code=d["code"],
            device_id=d["device_id"],
            platform=d["platform"],
            app_version=d.get("app_version", ""),
        )
        if is_new_device:
            record_audit(
                action="auth.new_device_login",
                entity=device,
                request=request,
                actor=user,
                shop=None,
                after={"platform": device.platform, "device_id": device.device_id},
            )
        pending = pending_invites_for_phone(user.phone).count()
        return Response(
            {
                "user": UserSerializer(user).data,
                "tokens": tokens,
                "shops": my_shops(user),
                "pending_invites": pending,
            }
        )


class RefreshView(TokenRefreshView):
    serializer_class = DeviceAwareTokenRefreshSerializer
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "token_refresh"


class MeView(APIView):
    @extend_schema(responses={200: dict}, summary="Current user and their shops")
    def get(self, request):
        pending = pending_invites_for_phone(request.user.phone).count()
        return Response(
            {
                "user": UserSerializer(request.user).data,
                "shops": my_shops(request.user),
                "pending_invites": pending,
            }
        )

    @extend_schema(request=ProfileUpdateSerializer, responses={200: dict}, summary="Update profile")
    def patch(self, request):
        s = ProfileUpdateSerializer(request.user, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        pending = pending_invites_for_phone(request.user.phone).count()
        return Response(
            {
                "user": UserSerializer(request.user).data,
                "shops": my_shops(request.user),
                "pending_invites": pending,
            }
        )


def _current_device(request):
    token = request.auth
    return UserDevice.objects.filter(user=request.user, device_id=token.get("did") if token else None).first()


class LogoutView(APIView):
    @extend_schema(request=None, responses={204: None}, summary="Log out current device")
    def post(self, request):
        device = _current_device(request)
        if device is not None:
            revoke_device(device)
        return Response(status=status.HTTP_204_NO_CONTENT)


class LogoutAllView(APIView):
    @extend_schema(request=None, responses={204: None}, summary="Log out all devices")
    def post(self, request):
        record_audit(
            action="auth.logout_all",
            request=request,
            actor=request.user,
            shop=None,
        )
        logout_everywhere(request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class DeviceListView(APIView):
    @extend_schema(responses={200: DeviceSerializer(many=True)}, summary="List active devices")
    def get(self, request):
        devices = UserDevice.objects.filter(user=request.user, revoked_at__isnull=True).order_by("-last_seen_at")
        current = request.auth.get("did") if request.auth else None
        return Response(DeviceSerializer(devices, many=True, context={"current_device_id": current}).data)


class DeviceRevokeView(APIView):
    @extend_schema(responses={204: None}, summary="Revoke a device")
    def delete(self, request, pk):
        device = UserDevice.objects.filter(user=request.user, pk=pk, revoked_at__isnull=True).first()
        if device is None:
            raise NotFoundError()
        record_audit(
            action="auth.device_revoked",
            entity=device,
            request=request,
            actor=request.user,
            shop=None,
            after={"device_id": device.device_id},
        )
        revoke_device(device)
        return Response(status=status.HTTP_204_NO_CONTENT)


class AccountDeletionView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(
        responses={200: AccountDeletionRequestSerializer},
        summary="Check active account deletion request",
    )
    def get(self, request):
        pending = AccountDeletionRequest.objects.filter(
            user=request.user, status=AccountDeletionRequest.StatusChoices.PENDING
        ).first()
        if not pending:
            return Response(None)
        return Response(AccountDeletionRequestSerializer(pending).data)

    @extend_schema(
        request=CreateAccountDeletionRequestSerializer,
        responses={201: AccountDeletionRequestSerializer},
        summary="Request account deletion",
    )
    def post(self, request):
        s = CreateAccountDeletionRequestSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        reason = s.validated_data.get("reason", "")
        req = request_account_deletion(user=request.user, reason=reason)
        record_audit(
            action="auth.account_deletion_requested",
            entity=req,
            request=request,
            actor=request.user,
            shop=None,
            after={"reason": reason, "scheduled_for": str(req.scheduled_for)},
        )
        return Response(AccountDeletionRequestSerializer(req).data, status=status.HTTP_201_CREATED)

    @extend_schema(
        responses={200: AccountDeletionRequestSerializer},
        summary="Cancel pending account deletion request",
    )
    def delete(self, request):
        req = cancel_account_deletion(user=request.user)
        record_audit(
            action="auth.account_deletion_cancelled",
            entity=req,
            request=request,
            actor=request.user,
            shop=None,
        )
        return Response(AccountDeletionRequestSerializer(req).data)
