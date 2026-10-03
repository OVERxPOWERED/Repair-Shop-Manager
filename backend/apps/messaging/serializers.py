"""
Serializers for customer messaging, logs, and template management.
"""

from rest_framework import serializers

from apps.messaging.models import (
    MessageLog,
    MessageTemplate,
    TemplateChannelChoices,
    TemplateKeyChoices,
)


class MessageLogSerializer(serializers.ModelSerializer):
    job_id = serializers.UUIDField(source="job.id", read_only=True)

    class Meta:
        model = MessageLog
        fields = (
            "id",
            "job_id",
            "channel",
            "to_phone_masked",
            "template_key",
            "locale",
            "status",
            "provider_message_id",
            "error_code",
            "cost_paise",
            "sent_at",
            "created_at",
        )
        read_only_fields = fields


class MessageTemplateSerializer(serializers.ModelSerializer):
    is_override = serializers.SerializerMethodField()

    class Meta:
        model = MessageTemplate
        fields = (
            "id",
            "shop",
            "key",
            "channel",
            "locale",
            "body",
            "dlt_template_id",
            "wa_template_name",
            "is_active",
            "is_override",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "shop", "key", "channel", "locale", "dlt_template_id", "created_at", "updated_at")

    def get_is_override(self, obj) -> bool:
        return obj.shop_id is not None

    def validate_body(self, value):
        # Disallow modifying SMS templates directly; TRAI DLT regulations require exact template match
        channel = self.instance.channel if self.instance else self.initial_data.get("channel")
        if channel == TemplateChannelChoices.SMS:
            raise serializers.ValidationError(
                "SMS template bodies cannot be edited directly due to TRAI DLT regulations."
            )
        return value


class SendJobMessageSerializer(serializers.Serializer):
    key = serializers.ChoiceField(choices=TemplateKeyChoices.choices)
    channel = serializers.ChoiceField(
        choices=TemplateChannelChoices.choices,
        default=TemplateChannelChoices.SMS,
        required=False,
    )
