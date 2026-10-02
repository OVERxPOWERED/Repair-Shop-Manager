"""
Authentication and user account views.
"""

from django.core.exceptions import ValidationError
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.serializers import (
    SendOTPSerializer,
    UserSerializer,
    VerifyOTPSerializer,
)
from apps.accounts.services import send_otp_challenge, verify_otp_challenge
from apps.core.api.errors import DomainError


class SendOTPView(APIView):
    """
    Public endpoint to initiate phone number login / registration.
    Issues a 6-digit OTP code and records a challenge.
    """

    permission_classes = (permissions.AllowAny,)

    @extend_schema(
        summary="Request SMS OTP",
        description="Generates a 6-digit OTP challenge for the given phone number with rate limiting.",
        request=SendOTPSerializer,
        responses={200: dict, 400: dict},
    )
    def post(self, request):
        serializer = SendOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        phone = serializer.validated_data["phone"]
        device_id = serializer.validated_data.get("device_id")
        ip = request.META.get("REMOTE_ADDR")

        try:
            challenge, cooldown = send_otp_challenge(phone=phone, device_id=device_id, ip=ip)
        except ValidationError as e:
            msg = str(e.message if hasattr(e, "message") else e)
            raise DomainError(msg, code="otp.request_failed", status=400) from e

        return Response(
            {
                "message": f"OTP successfully sent to {phone}",
                "cooldown_seconds": cooldown,
                "expires_at": challenge.expires_at.isoformat(),
            },
            status=status.HTTP_200_OK,
        )


class VerifyOTPView(APIView):
    """
    Public endpoint to verify OTP code and obtain JWT authentication tokens.
    Automatically provisions new user accounts on first successful login.
    """

    permission_classes = (permissions.AllowAny,)

    @extend_schema(
        summary="Verify SMS OTP & Authenticate",
        description="Validates OTP and returns rotating JWT access & refresh tokens.",
        request=VerifyOTPSerializer,
        responses={200: dict, 400: dict},
    )
    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        phone = serializer.validated_data["phone"]
        code = serializer.validated_data["code"]
        device_id = serializer.validated_data.get("device_id")
        platform = serializer.validated_data.get("platform", "web")
        app_version = serializer.validated_data.get("app_version", "")

        try:
            user, access_token, refresh_token = verify_otp_challenge(
                phone=phone, code=code, device_id=device_id, platform=platform, app_version=app_version
            )
        except ValidationError as e:
            msg = str(e.message if hasattr(e, "message") else e)
            raise DomainError(msg, code="otp.verification_failed", status=400) from e

        # Fetch active memberships for user
        memberships_data = []
        if hasattr(user, "memberships"):
            for m in user.memberships.filter(status="active").select_related("shop", "role"):
                memberships_data.append(
                    {
                        "membership_id": str(m.id),
                        "shop_id": str(m.shop.id),
                        "shop_name": m.shop.name,
                        "role_name": m.role.name,
                        "permissions": m.role.permissions,
                    }
                )

        return Response(
            {
                "user": UserSerializer(user).data,
                "tokens": {"access": access_token, "refresh": refresh_token, "token_type": "Bearer"},
                "shops": memberships_data,
            },
            status=status.HTTP_200_OK,
        )


class UserProfileView(APIView):
    """
    Authenticated endpoint to view or update current user profile.
    """

    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(summary="Get Current User Profile", responses={200: UserSerializer})
    def get(self, request):
        return Response(UserSerializer(request.user).data)

    @extend_schema(summary="Update Current User Profile", request=UserSerializer, responses={200: UserSerializer})
    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
