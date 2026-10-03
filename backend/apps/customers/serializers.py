from rest_framework import serializers

from apps.core.phone import normalize_phone
from apps.customers.models import Customer
from apps.customers.visibility import can_see_customer_phone, present_phone


class CustomerSerializer(serializers.ModelSerializer):
    phone_masked = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = (
            "id",
            "name",
            "phone",
            "alt_phone",
            "email",
            "address",
            "notes",
            "preferred_locale",
            "whatsapp_opt_in",
            "sms_opt_in",
            "last_job_at",
            "version",
            "created_at",
            "updated_at",
            "phone_masked",
        )
        read_only_fields = ("id", "last_job_at", "version", "created_at", "updated_at", "phone_masked")

    def get_phone_masked(self, obj) -> bool:
        request = self.context.get("request")
        membership = getattr(request, "membership", None) if request else None
        return not can_see_customer_phone(membership) if obj.phone else False

    def validate_phone(self, value):
        request = self.context.get("request")
        membership = getattr(request, "membership", None) if request else None
        if self.instance and not can_see_customer_phone(membership):
            return self.instance.phone
        if not value or not str(value).strip():
            return None
        try:
            return normalize_phone(str(value).strip())
        except ValueError as err:
            raise serializers.ValidationError(str(err)) from err

    def validate_alt_phone(self, value):
        request = self.context.get("request")
        membership = getattr(request, "membership", None) if request else None
        if self.instance and not can_see_customer_phone(membership):
            return self.instance.alt_phone
        if not value or not str(value).strip():
            return ""
        try:
            return normalize_phone(str(value).strip())
        except ValueError as err:
            raise serializers.ValidationError(str(err)) from err

    def validate(self, attrs):
        request = self.context.get("request")
        shop = getattr(request, "shop", None) or getattr(self.instance, "shop", None)
        phone = attrs.get("phone")
        if phone and shop:
            qs = Customer.objects.filter(shop=shop, phone=phone, deleted_at__isnull=True)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({"phone": ["customer.phone_exists"]})
        return attrs

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        membership = getattr(request, "membership", None) if request else None
        can_see = can_see_customer_phone(membership)
        data["phone"] = present_phone(instance.phone, membership)
        data["alt_phone"] = present_phone(instance.alt_phone, membership) if instance.alt_phone else ""
        data["phone_masked"] = not can_see if instance.phone else False
        return data

    def update(self, instance, validated_data):
        request = self.context.get("request")
        membership = getattr(request, "membership", None) if request else None
        if not can_see_customer_phone(membership):
            validated_data.pop("phone", None)
            validated_data.pop("alt_phone", None)
        return super().update(instance, validated_data)
