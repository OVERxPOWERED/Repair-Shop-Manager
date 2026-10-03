import re
from zoneinfo import ZoneInfo

from django.utils import timezone
from rest_framework import serializers

from apps.core.api.fields import ShopScopedPKField
from apps.customers.models import Customer
from apps.customers.visibility import can_see_customer_phone, present_phone
from apps.devices.models import Device
from apps.devices.serializers import DeviceIdentifierSerializer
from apps.jobs.constants import CONDITION_TAGS
from apps.jobs.models import Job, JobNote
from apps.tenancy.models import Membership


class JobCustomerSerializer(serializers.ModelSerializer):
    phone = serializers.SerializerMethodField()
    phone_masked = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = ("id", "name", "phone", "phone_masked")

    def get_phone_masked(self, obj) -> bool:
        request = self.context.get("request")
        membership = getattr(request, "membership", None) if request else None
        return not can_see_customer_phone(membership) if obj.phone else False

    def get_phone(self, obj) -> str:
        request = self.context.get("request")
        membership = getattr(request, "membership", None) if request else None
        return present_phone(obj.phone, membership)


class JobDeviceSerializer(serializers.ModelSerializer):
    brand_name = serializers.SerializerMethodField()
    identifiers = DeviceIdentifierSerializer(many=True, read_only=True)

    class Meta:
        model = Device
        fields = ("id", "category", "brand_id", "brand_name", "brand_text", "model", "color", "identifiers")

    def get_brand_name(self, obj) -> str:
        return obj.brand.name if obj.brand else (obj.brand_text or "")


class JobAssignedToSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = Membership
        fields = ("id", "display_name")

    def get_display_name(self, obj) -> str:
        return obj.display_name or (obj.user.name if obj.user else "")


class NestedCustomerCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, trim_whitespace=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True, allow_null=True)
    alt_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    preferred_locale = serializers.ChoiceField(choices=["en", "hi", "hi-Latn"], default="en")
    whatsapp_opt_in = serializers.BooleanField(default=True)
    sms_opt_in = serializers.BooleanField(default=True)


class JobCreateSerializer(serializers.Serializer):
    customer_id = ShopScopedPKField(queryset=Customer.objects.all(), source="customer", required=False)
    new_customer = NestedCustomerCreateSerializer(required=False)
    device_id = ShopScopedPKField(queryset=Device.objects.all(), source="device", required=False)
    new_device = serializers.DictField(required=False)

    kind = serializers.ChoiceField(choices=Job.Kind.choices, default=Job.Kind.FULL)
    priority = serializers.ChoiceField(choices=Job.Priority.choices, default=Job.Priority.NORMAL)
    source = serializers.ChoiceField(choices=Job.Source.choices, default=Job.Source.WALK_IN)
    fault_description = serializers.CharField(trim_whitespace=True)
    device_condition = serializers.CharField(required=False, allow_blank=True, default="")
    condition_tags = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    accessories = serializers.ListField(child=serializers.CharField(max_length=60), required=False, default=list)

    lock_type = serializers.ChoiceField(choices=Job.LockType.choices, default=Job.LockType.NONE)
    lock_value = serializers.CharField(required=False, allow_blank=True, write_only=True, default="")

    estimate_paise = serializers.IntegerField(min_value=0, default=0)
    expected_date = serializers.DateField(required=False, allow_null=True)
    assigned_to_id = ShopScopedPKField(
        queryset=Membership.objects.filter(status=Membership.StatusChoices.ACTIVE),
        source="assigned_to",
        required=False,
        allow_null=True,
    )
    internal_note = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        # 1. Exactly one of customer_id / new_customer
        has_cust_id = bool(attrs.get("customer"))
        has_new_cust = bool(attrs.get("new_customer"))
        if has_cust_id == has_new_cust:
            raise serializers.ValidationError(
                {"customer_id": ["Provide either customer_id or new_customer, but not both."]}
            )

        # 2. Exactly one of device_id / new_device
        has_dev_id = bool(attrs.get("device"))
        has_new_dev = bool(attrs.get("new_device"))
        if has_dev_id == has_new_dev:
            raise serializers.ValidationError({"device_id": ["Provide either device_id or new_device, but not both."]})

        # 3. Expected date validation
        expected_date = attrs.get("expected_date")
        if expected_date:
            today_ist = timezone.now().astimezone(ZoneInfo("Asia/Kolkata")).date()
            if expected_date < today_ist:
                raise serializers.ValidationError({"expected_date": ["Expected date cannot be in the past."]})

        # 4. Accessories limit
        accessories = attrs.get("accessories", [])
        if len(accessories) > 20:
            raise serializers.ValidationError({"accessories": ["Maximum 20 accessories allowed."]})

        # 5. Condition tags validation
        condition_tags = attrs.get("condition_tags", [])
        for tag in condition_tags:
            if tag not in CONDITION_TAGS:
                raise serializers.ValidationError({"condition_tags": [f"Unknown condition tag: {tag}"]})

        # 6. Lock validation
        lock_type = attrs.get("lock_type", Job.LockType.NONE)
        lock_value = attrs.get("lock_value", "").strip()
        if lock_type == Job.LockType.PIN:
            if not lock_value or not re.fullmatch(r"\d{4,16}", lock_value):
                raise serializers.ValidationError({"lock_value": ["PIN must be between 4 and 16 digits."]})
        elif lock_type == Job.LockType.PATTERN:
            if not lock_value or not re.fullmatch(r"^[1-9](-[1-9]){3,8}$", lock_value):
                raise serializers.ValidationError(
                    {"lock_value": ["Pattern must be a sequence of 4 to 9 nodes (1-9), e.g. '1-2-3-6'."]}
                )
            nodes = lock_value.split("-")
            if len(nodes) != len(set(nodes)):
                raise serializers.ValidationError({"lock_value": ["Pattern cannot repeat nodes."]})
        elif lock_type == Job.LockType.PASSWORD:
            if not lock_value or len(lock_value) < 1 or len(lock_value) > 64:
                raise serializers.ValidationError({"lock_value": ["Password must be between 1 and 64 characters."]})
        elif lock_type == Job.LockType.NONE:
            attrs["lock_value"] = ""

        return attrs


class JobUpdateSerializer(serializers.Serializer):
    fault_description = serializers.CharField(required=False, trim_whitespace=True)
    device_condition = serializers.CharField(required=False, allow_blank=True)
    condition_tags = serializers.ListField(child=serializers.CharField(), required=False)
    priority = serializers.ChoiceField(choices=Job.Priority.choices, required=False)
    estimate_paise = serializers.IntegerField(min_value=0, required=False)
    expected_date = serializers.DateField(required=False, allow_null=True)
    lock_type = serializers.ChoiceField(choices=Job.LockType.choices, required=False)
    lock_value = serializers.CharField(required=False, allow_blank=True, write_only=True)
    accessories = serializers.ListField(child=serializers.CharField(max_length=60), max_length=20, required=False)
    assigned_to_id = ShopScopedPKField(
        queryset=Membership.objects.filter(status=Membership.StatusChoices.ACTIVE),
        source="assigned_to",
        required=False,
        allow_null=True,
    )

    def validate(self, attrs):
        expected_date = attrs.get("expected_date")
        if expected_date:
            today_ist = timezone.now().astimezone(ZoneInfo("Asia/Kolkata")).date()
            if expected_date < today_ist:
                raise serializers.ValidationError({"expected_date": ["Expected date cannot be in the past."]})

        condition_tags = attrs.get("condition_tags")
        if condition_tags is not None:
            for tag in condition_tags:
                if tag not in CONDITION_TAGS:
                    raise serializers.ValidationError({"condition_tags": [f"Unknown condition tag: {tag}"]})

        lock_type = attrs.get("lock_type")
        lock_value = attrs.get("lock_value")
        if lock_type or lock_value:
            effective_type = lock_type or (self.instance.lock_type if self.instance else Job.LockType.NONE)
            val = (lock_value or "").strip()
            if effective_type == Job.LockType.PIN and val:
                if not re.fullmatch(r"\d{4,16}", val):
                    raise serializers.ValidationError({"lock_value": ["PIN must be between 4 and 16 digits."]})
            elif effective_type == Job.LockType.PATTERN and val:
                if not re.fullmatch(r"^[1-9](-[1-9]){3,8}$", val):
                    raise serializers.ValidationError(
                        {"lock_value": ["Pattern must be a sequence of 4 to 9 nodes (1-9), e.g. '1-2-3-6'."]}
                    )
                nodes = val.split("-")
                if len(nodes) != len(set(nodes)):
                    raise serializers.ValidationError({"lock_value": ["Pattern cannot repeat nodes."]})
            elif effective_type == Job.LockType.PASSWORD and val and (len(val) < 1 or len(val) > 64):
                raise serializers.ValidationError({"lock_value": ["Password must be between 1 and 64 characters."]})

        return attrs


class JobSerializer(serializers.ModelSerializer):
    has_lock = serializers.SerializerMethodField()
    customer = JobCustomerSerializer(read_only=True)
    device = JobDeviceSerializer(read_only=True)
    assigned_to = JobAssignedToSerializer(read_only=True)
    accessories = serializers.SerializerMethodField()

    class Meta:
        model = Job
        fields = (
            "id",
            "job_no",
            "kind",
            "customer",
            "device",
            "assigned_to",
            "status",
            "priority",
            "source",
            "fault_description",
            "device_condition",
            "condition_tags",
            "lock_type",
            "has_lock",
            "estimate_paise",
            "expected_date",
            "received_at",
            "ready_at",
            "delivered_at",
            "warranty_days",
            "warranty_until",
            "tracking_token",
            "is_locked",
            "cancel_reason",
            "total_paise",
            "cost_paise",
            "accessories",
            "version",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_has_lock(self, obj) -> bool:
        return bool(obj.lock_value_enc)

    def get_accessories(self, obj) -> list[str]:
        return [acc.name for acc in obj.accessories.all()]

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        request = self.context.get("request")
        membership = getattr(request, "membership", None) if request else None
        can_see_cost = membership.has_perm("money.see_cost_profit") if membership else False
        if not can_see_cost:
            ret.pop("cost_paise", None)
        return ret


class JobNoteSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = JobNote
        fields = ("id", "job_id", "author_name", "body", "visibility", "created_at")
        read_only_fields = ("id", "job_id", "author_name", "created_at")

    def get_author_name(self, obj) -> str:
        return obj.author.name if (obj.author and obj.author.name) else "Staff"
