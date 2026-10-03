from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.core.models import UUIDModel


class AppendOnlyQuerySet(models.QuerySet):
    def update(self, **kwargs):
        raise RuntimeError("audit_log is append-only")

    def delete(self):
        raise RuntimeError("audit_log is append-only")


class AuditLog(UUIDModel):
    shop = models.ForeignKey("tenancy.Shop", on_delete=models.PROTECT, null=True, blank=True, related_name="+")
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="+"
    )
    action = models.CharField(max_length=64)
    entity_type = models.CharField(max_length=64, blank=True, default="")
    entity_id = models.CharField(max_length=64, blank=True, default="")
    before = models.JSONField(null=True, blank=True)
    after = models.JSONField(null=True, blank=True)
    ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True, default="")
    request_id = models.CharField(max_length=64, blank=True, default="")
    created_at = models.DateTimeField(default=timezone.now)

    objects = AppendOnlyQuerySet.as_manager()

    class Meta:
        indexes = [
            models.Index(fields=["shop", "-created_at"], name="audit_shop_created_idx"),
            models.Index(fields=["entity_type", "entity_id"], name="audit_entity_idx"),
        ]
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise RuntimeError("audit_log is append-only")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise RuntimeError("audit_log is append-only")

    def __str__(self):
        return f"[{self.created_at}] {self.action} by {self.actor or 'system'} ({self.entity_type}:{self.entity_id})"
