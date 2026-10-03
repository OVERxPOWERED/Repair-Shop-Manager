"""
Serializers for tenancy resources.
"""

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from apps.accounts.serializers import normalize_phone
from apps.core.validators import validate_gstin, validate_state_code, validate_upi_id
from apps.tenancy.models import AccessoryOption, Invite, Membership, Organization, Role, Shop, ShopBrand


class ShopBrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShopBrand
        fields = (
            "id",
            "device_category",
            "name",
            "is_active",
            "sort_order",
            "version",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "version", "created_at", "updated_at")


class AccessoryOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccessoryOption
        fields = (
            "id",
            "name",
            "is_default",
            "sort_order",
            "version",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "version", "created_at", "updated_at")


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


SHOP_FIELDS = (
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
    "auto_sms_events",
    "version",
    "created_at",
    "updated_at",
)


def _django_to_drf(func, value, field):
    try:
        return func(value)
    except DjangoValidationError as err:
        raise serializers.ValidationError({field: err.messages}) from err


class ShopSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shop
        fields = SHOP_FIELDS
        read_only_fields = ("id", "organization_id", "version", "created_at", "updated_at")

    def validate_phone(self, value):
        return normalize_phone(value) if value else value

    def validate_auto_sms_events(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("auto_sms_events must be a list.")
        allowed = {"job_received", "ready_for_pickup", "delivered"}
        invalid = set(value) - allowed
        if invalid:
            raise serializers.ValidationError(
                f"Invalid auto_sms_events: {', '.join(sorted(invalid))}. Allowed: {', '.join(sorted(allowed))}."
            )
        return list(dict.fromkeys(value))

    def validate(self, attrs):
        def current(name, default=None):
            return attrs.get(name, getattr(self.instance, name, default))

        gst_enabled = current("gst_enabled", False)
        gstin = current("gstin")
        state_code = current("state_code", "")
        _django_to_drf(validate_state_code, state_code, "state_code")
        _django_to_drf(validate_upi_id, current("upi_id"), "upi_id")
        if gst_enabled:
            if not gstin:
                raise serializers.ValidationError({"gstin": ["GSTIN is required when GST is enabled."]})
            gstin = _django_to_drf(validate_gstin, gstin, "gstin")
            attrs["gstin"] = gstin
            if state_code and state_code != gstin[:2]:
                raise serializers.ValidationError({"state_code": ["State code must match the GSTIN."]})
            attrs["state_code"] = gstin[:2]
            if current("registration_type", "unregistered") == "unregistered":
                attrs["registration_type"] = Shop.RegistrationTypeChoices.REGULAR

            prefix = current("invoice_prefix", "INV")
            if prefix:
                clean_prefix = str(prefix).strip().upper()
                if not (1 <= len(clean_prefix) <= 4 and clean_prefix.isalnum()):
                    raise serializers.ValidationError(
                        {"invoice_prefix": ["Prefix must be 1-4 alphanumeric characters when GST is enabled."]}
                    )
                attrs["invoice_prefix"] = clean_prefix
        else:
            attrs["registration_type"] = Shop.RegistrationTypeChoices.UNREGISTERED
        return attrs


class OnboardShopSerializer(ShopSerializer):
    organization_name = serializers.CharField(max_length=150, required=False, allow_blank=True, write_only=True)

    class Meta(ShopSerializer.Meta):
        fields = (*SHOP_FIELDS, "organization_name")
        extra_kwargs = {"name": {"required": True}, "phone": {"required": False}}


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
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class AssignableStaffSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source="role.name", read_only=True)

    class Meta:
        model = Membership
        fields = ("id", "display_name", "role_name")
        read_only_fields = fields


class ChangeRoleSerializer(serializers.Serializer):
    role_id = serializers.UUIDField()


class InviteSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source="role.name", read_only=True)
    invited_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Invite
        fields = (
            "id",
            "shop_id",
            "phone",
            "role_id",
            "role_name",
            "invited_by_name",
            "expires_at",
            "accepted_at",
            "created_at",
        )
        read_only_fields = fields

    def get_invited_by_name(self, obj) -> str | None:
        if obj.invited_by:
            return obj.invited_by.name or obj.invited_by.phone
        return None


class CreateInviteSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=16)
    role_id = serializers.UUIDField()

    def validate_phone(self, value):
        return normalize_phone(value)


class MyInviteSerializer(serializers.ModelSerializer):
    shop_name = serializers.CharField(source="shop.name", read_only=True)
    role_name = serializers.CharField(source="role.name", read_only=True)
    inviter_name = serializers.SerializerMethodField()

    class Meta:
        model = Invite
        fields = (
            "id",
            "shop_id",
            "shop_name",
            "role_id",
            "role_name",
            "inviter_name",
            "expires_at",
            "created_at",
        )
        read_only_fields = fields

    def get_inviter_name(self, obj) -> str:
        if obj.invited_by:
            return obj.invited_by.name or obj.invited_by.phone
        return "Shop Owner"
