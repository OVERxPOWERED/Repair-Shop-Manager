from rest_framework import serializers

from apps.billing.models import Payment, PaymentMode


class PaymentSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    received_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = (
            "id",
            "job_id",
            "customer_id",
            "customer_name",
            "direction",
            "mode",
            "amount_paise",
            "reference",
            "received_by_id",
            "received_by_name",
            "received_at",
            "refunds_payment_id",
            "notes",
            "created_at",
        )
        read_only_fields = fields

    def get_customer_name(self, obj) -> str:
        return obj.customer.name if obj.customer else ""

    def get_received_by_name(self, obj) -> str:
        return obj.received_by.name if obj.received_by else ""


class PaymentCreateSerializer(serializers.Serializer):
    mode = serializers.ChoiceField(choices=PaymentMode.choices)
    amount_paise = serializers.IntegerField(min_value=1)
    reference = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class PaymentRefundSerializer(serializers.Serializer):
    amount_paise = serializers.IntegerField(min_value=1)
    reason = serializers.CharField(required=False, allow_blank=True, default="")


class JobPaymentsSummarySerializer(serializers.Serializer):
    items = PaymentSerializer(many=True)
    paid_paise = serializers.IntegerField()
    balance_paise = serializers.IntegerField()
