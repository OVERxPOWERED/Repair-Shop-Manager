"""
Serializers for payments, invoices, invoice lines, and billing actions.
"""

from decimal import Decimal

from rest_framework import serializers

from apps.billing.models import Invoice, InvoiceLine, Payment, PaymentMode
from apps.core.money import mul_qty
from apps.core.validators import validate_gstin, validate_state_code

# ---------------------------------------------------------------------------
# Payment Serializers
# ---------------------------------------------------------------------------


class PaymentSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    received_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = (
            "id",
            "invoice_id",
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


# ---------------------------------------------------------------------------
# Invoice Serializers
# ---------------------------------------------------------------------------


class InvoiceLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceLine
        fields = (
            "id",
            "position",
            "description",
            "hsn_sac",
            "quantity",
            "unit_price_paise",
            "discount_paise",
            "tax_inclusive",
            "tax_rate_bp",
            "taxable_paise",
            "cgst_paise",
            "sgst_paise",
            "igst_paise",
            "line_total_paise",
        )
        read_only_fields = (
            "id",
            "position",
            "taxable_paise",
            "cgst_paise",
            "sgst_paise",
            "igst_paise",
            "line_total_paise",
        )


class InvoiceLineInputSerializer(serializers.Serializer):
    description = serializers.CharField(max_length=255)
    hsn_sac = serializers.CharField(max_length=8, required=False, allow_blank=True, default="")
    quantity = serializers.DecimalField(
        max_digits=10, decimal_places=3, min_value=Decimal("0.001"), default=Decimal("1")
    )
    unit_price_paise = serializers.IntegerField(min_value=0)
    discount_paise = serializers.IntegerField(min_value=0, default=0)
    tax_inclusive = serializers.BooleanField(default=False)
    tax_rate_bp = serializers.IntegerField(min_value=0, default=0)

    def validate(self, attrs):
        qty = attrs.get("quantity", Decimal("1"))
        price = attrs.get("unit_price_paise", 0)
        discount = attrs.get("discount_paise", 0)
        gross = mul_qty(price, qty)
        if discount > gross:
            raise serializers.ValidationError({"discount_paise": ["Discount cannot exceed gross amount."]})
        return attrs


class InvoiceSerializer(serializers.ModelSerializer):
    lines = InvoiceLineSerializer(many=True, read_only=True)
    balance_paise = serializers.IntegerField(read_only=True)

    class Meta:
        model = Invoice
        fields = (
            "id",
            "job_id",
            "customer_id",
            "kind",
            "status",
            "series_id",
            "number",
            "number_display",
            "issue_date",
            "original_invoice_id",
            "place_of_supply_state",
            "customer_gstin",
            "subtotal_paise",
            "discount_paise",
            "taxable_paise",
            "cgst_paise",
            "sgst_paise",
            "igst_paise",
            "round_off_paise",
            "total_paise",
            "amount_paid_paise",
            "balance_paise",
            "shop_snapshot",
            "customer_snapshot",
            "pdf_key",
            "notes",
            "terms",
            "issued_by_id",
            "issued_at",
            "cancelled_at",
            "cancel_reason",
            "lines",
            "version",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "job_id",
            "customer_id",
            "kind",
            "status",
            "series_id",
            "number",
            "number_display",
            "issue_date",
            "original_invoice_id",
            "subtotal_paise",
            "discount_paise",
            "taxable_paise",
            "cgst_paise",
            "sgst_paise",
            "igst_paise",
            "round_off_paise",
            "total_paise",
            "amount_paid_paise",
            "balance_paise",
            "shop_snapshot",
            "customer_snapshot",
            "pdf_key",
            "issued_by_id",
            "issued_at",
            "cancelled_at",
            "cancel_reason",
            "lines",
            "version",
            "created_at",
            "updated_at",
        )


class InvoiceDraftUpdateSerializer(serializers.Serializer):
    customer_gstin = serializers.CharField(max_length=15, required=False, allow_blank=True)
    place_of_supply_state = serializers.CharField(max_length=2, required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    terms = serializers.CharField(required=False, allow_blank=True)
    lines = InvoiceLineInputSerializer(many=True, required=False)

    def validate_customer_gstin(self, value):
        if value:
            validate_gstin(value.strip().upper())
        return value.strip().upper() if value else ""

    def validate_place_of_supply_state(self, value):
        if value:
            validate_state_code(value.strip())
        return value.strip() if value else ""


class InvoiceCancelSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=500, required=True, allow_blank=False)
