"""
Serializers for tenancy resources.
"""

from rest_framework import serializers

from apps.accounts.serializers import normalize_phone
from apps.tenancy.models import Invite, Membership, Organization, Role, Shop


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ("id", "name", "is_system", "permissions")
        read_only_fields = ("id", "is_system")


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ("id", "name", "status", "created_at")
        read_only_fields = ("id", "status", "created_at")


class ShopSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shop
        fields = (
            "id",
            "organization_id",
            "name",
            "shop_type",
            "phone",
            "address_line1",
            "address_line2",
            "city",
            "pincode",
            "state_code",
            "latitude",
            "longitude",
            "logo_key",
            "timezone",
            "default_locale",
            "gst_enabled",
            "gstin",
            "registration_type",
            "upi_id",
            "invoice_prefix",
            "round_off_enabled",
            "lock_order_after_delivery",
            "engineers_see_assigned_only",
            "mask_phone_for_engineers",
            "default_warranty_days",
            "tracking_enabled",
            "tracking_expiry_days",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "organization_id", "created_at", "updated_at")


class OnboardShopSerializer(serializers.Serializer):
    """
    Used during initial onboarding to provision organization and first shop.
    """

    organization_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    shop_name = serializers.CharField(max_length=150)
    shop_type = serializers.ChoiceField(choices=Shop.ShopTypeChoices.choices, default=Shop.ShopTypeChoices.MOBILE)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    address_line1 = serializers.CharField(required=False, allow_blank=True, default="")
    city = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    pincode = serializers.CharField(max_length=10, required=False, allow_blank=True, default="")
    state_code = serializers.CharField(max_length=2, required=False, allow_blank=True, default="")
    gst_enabled = serializers.BooleanField(default=False)
    gstin = serializers.CharField(max_length=15, required=False, allow_null=True, allow_blank=True)
    upi_id = serializers.CharField(max_length=100, required=False, allow_null=True, allow_blank=True)

    def validate_phone(self, value):
        if value:
            return normalize_phone(value)
        return value


class MembershipSerializer(serializers.ModelSerializer):
    user_phone = serializers.CharField(source="user.phone", read_only=True)
    user_name = serializers.CharField(source="user.name", read_only=True)
    role_name = serializers.CharField(source="role.name", read_only=True)

    class Meta:
        model = Membership
        fields = (
            "id",
            "user_id",
            "user_phone",
            "user_name",
            "shop_id",
            "role_id",
            "role_name",
            "status",
            "display_name",
            "joined_at",
        )
        read_only_fields = ("id", "user_id", "shop_id", "joined_at")


class InviteSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source="role.name", read_only=True)

    class Meta:
        model = Invite
        fields = (
            "id",
            "shop_id",
            "phone",
            "role_id",
            "role_name",
            "expires_at",
            "accepted_at",
            "created_at",
        )
        read_only_fields = ("id", "shop_id", "expires_at", "accepted_at", "created_at")

    def validate_phone(self, value):
        return normalize_phone(value)
