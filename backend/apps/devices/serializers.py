from rest_framework import serializers

from apps.core.api.fields import ShopScopedPKField
from apps.customers.models import Customer
from apps.devices.models import Device, DeviceIdentifier
from apps.devices.services import create_device, update_device
from apps.tenancy.models import ShopBrand


class DeviceIdentifierSerializer(serializers.ModelSerializer):
    confirm_invalid = serializers.BooleanField(required=False, write_only=True, default=False)
    captured_via = serializers.ChoiceField(
        choices=DeviceIdentifier.CapturedVia.choices,
        default=DeviceIdentifier.CapturedVia.MANUAL,
        required=False,
    )

    class Meta:
        model = DeviceIdentifier
        fields = ("id", "type", "value", "luhn_valid", "captured_via", "confirm_invalid")
        read_only_fields = ("id", "luhn_valid")


class DeviceSerializer(serializers.ModelSerializer):
    customer_id = ShopScopedPKField(queryset=Customer.objects.all(), source="customer")
    brand_id = ShopScopedPKField(queryset=ShopBrand.objects.all(), source="brand", required=False, allow_null=True)
    brand_name = serializers.SerializerMethodField()
    identifiers = DeviceIdentifierSerializer(many=True, required=False)

    class Meta:
        model = Device
        fields = (
            "id",
            "customer_id",
            "category",
            "brand_id",
            "brand_name",
            "brand_text",
            "model",
            "color",
            "notes",
            "identifiers",
            "version",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "brand_name", "version", "created_at", "updated_at")

    def get_brand_name(self, obj) -> str:
        return obj.brand.name if obj.brand else (obj.brand_text or "")

    def validate_identifiers(self, value):
        types = [item["type"] for item in value]
        if len(types) != len(set(types)):
            raise serializers.ValidationError("Duplicate identifier type on device.")
        return value

    def create(self, validated_data):
        identifiers_data = validated_data.pop("identifiers", [])
        request = self.context.get("request")
        shop = validated_data.pop("shop", getattr(request, "shop", None))
        user = validated_data.pop("created_by", getattr(request, "user", None))
        customer = validated_data.pop("customer")
        validated_data["identifiers"] = identifiers_data
        return create_device(shop=shop, actor=user, customer=customer, data=validated_data)

    def update(self, instance, validated_data):
        request = self.context.get("request")
        user = request.user if request else None
        return update_device(instance, actor=user, data=validated_data)
