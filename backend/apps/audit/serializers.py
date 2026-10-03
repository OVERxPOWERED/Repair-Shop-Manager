from rest_framework import serializers

from apps.audit.models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = (
            "id",
            "shop",
            "actor",
            "actor_name",
            "action",
            "entity_type",
            "entity_id",
            "before",
            "after",
            "ip",
            "user_agent",
            "request_id",
            "created_at",
        )
        read_only_fields = fields

    def get_actor_name(self, obj) -> str | None:
        return obj.actor.name if obj.actor else None
