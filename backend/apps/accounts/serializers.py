"""
Serializers for accounts and authentication.
"""

from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.accounts.models import AccountDeletionRequest, UserDevice
from apps.core.phone import normalize_phone as _normalize

User = get_user_model()


def normalize_phone(value: str) -> str:
    try:
        return _normalize(value)
    except ValueError as err:
        raise serializers.ValidationError(str(err)) from err


class SendOTPSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=20)
    device_id = serializers.CharField(max_length=128, required=False, allow_blank=True)
    platform = serializers.ChoiceField(
        choices=UserDevice.PlatformChoices.choices, default=UserDevice.PlatformChoices.WEB
    )

    def validate_phone(self, value):
        return normalize_phone(value)


class VerifyOTPSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=20)
    code = serializers.CharField(min_length=6, max_length=6)
    device_id = serializers.CharField(max_length=128)
    platform = serializers.ChoiceField(
        choices=UserDevice.PlatformChoices.choices, default=UserDevice.PlatformChoices.WEB
    )
    app_version = serializers.CharField(max_length=32, required=False, allow_blank=True, default="")

    def validate_phone(self, value):
        return normalize_phone(value)

    def validate_code(self, value):
        cleaned = value.strip()
        if not cleaned.isdigit() or len(cleaned) != 6:
            raise serializers.ValidationError("OTP code must be exactly 6 numeric digits.")
        return cleaned


class GoogleAuthSerializer(serializers.Serializer):
    id_token = serializers.CharField()
    device_id = serializers.CharField(max_length=128)
    platform = serializers.ChoiceField(
        choices=UserDevice.PlatformChoices.choices, default=UserDevice.PlatformChoices.WEB
    )
    app_version = serializers.CharField(max_length=32, required=False, allow_blank=True, default="")


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "phone",
            "name",
            "email",
            "preferred_locale",
            "is_active",
            "is_platform_admin",
            "last_login_at",
            "created_at",
        )
        read_only_fields = ("id", "is_active", "is_platform_admin", "last_login_at", "created_at")


class ProfileUpdateSerializer(serializers.ModelSerializer):
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = User
        fields = ("name", "email", "phone", "preferred_locale")

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Name is required.")
        return value

    def validate_phone(self, value):
        if not value:
            return None
        normalized = normalize_phone(value)
        user = self.instance
        if User.objects.filter(phone=normalized).exclude(pk=user.pk if user else None).exists():
            raise serializers.ValidationError("A user with this phone number already exists.")
        return normalized


class MyShopSerializer(serializers.Serializer):
    """
    One entry per active or pending requested membership.
    Drives the shop switcher and client-side permission checks.
    """

    membership_id = serializers.UUIDField(source="id")
    shop_id = serializers.UUIDField(source="shop.id")
    shop_name = serializers.CharField(source="shop.name")
    shop_type = serializers.CharField(source="shop.shop_type")
    city = serializers.CharField(source="shop.city")
    status = serializers.CharField()
    role_id = serializers.SerializerMethodField()
    role_name = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()

    def get_role_id(self, obj):
        return str(obj.role.id) if obj.role else None

    def get_role_name(self, obj):
        return obj.role.name if obj.role else "Pending Approval"

    def get_permissions(self, obj):
        if obj.status == "requested" or not obj.role:
            return []
        return obj.role.permissions or []


class DeviceSerializer(serializers.ModelSerializer):
    is_current = serializers.SerializerMethodField()

    class Meta:
        model = UserDevice
        fields = ("id", "device_id", "platform", "app_version", "last_seen_at", "is_current")
        ref_name = "UserDevice"

    def get_is_current(self, obj) -> bool:
        return obj.device_id == self.context.get("current_device_id")


UserDeviceSerializer = DeviceSerializer


def my_shops(user):
    from apps.tenancy.models import Membership

    memberships = (
        Membership.objects.filter(
            user=user,
            status__in=[Membership.StatusChoices.ACTIVE, Membership.StatusChoices.REQUESTED],
            shop__deleted_at__isnull=True,
        )
        .select_related("shop", "role")
        .order_by("shop__name")
    )
    return MyShopSerializer(memberships, many=True).data


class AccountDeletionRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccountDeletionRequest
        fields = ("id", "requested_at", "scheduled_for", "status", "completed_at", "reason")
        read_only_fields = ("id", "requested_at", "scheduled_for", "status", "completed_at")


class CreateAccountDeletionRequestSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, max_length=500, default="")
