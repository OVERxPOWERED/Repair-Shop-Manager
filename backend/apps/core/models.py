"""
Abstract base models and managers for FixPro.
Enforces UUID primary keys, timestamps, soft-deletion, and tenant scoping.
"""

import uuid

from django.db import models
from django.utils import timezone


class UUIDModel(models.Model):
    """Abstract base model with a UUID primary key."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True


class TimeStampedModel(models.Model):
    """Abstract base model tracking creation and update timestamps."""

    created_at = models.DateTimeField(default=timezone.now, editable=False, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class SoftDeletableQuerySet(models.QuerySet):
    """QuerySet that filters out soft-deleted objects by default."""

    def alive(self):
        return self.filter(deleted_at__isnull=True)

    def dead(self):
        return self.filter(deleted_at__isnull=False)

    def delete(self):
        """Soft delete all records in queryset."""
        return self.update(deleted_at=timezone.now())

    def hard_delete(self):
        """Permanently delete all records in queryset."""
        return super().delete()


class SoftDeletableManager(models.Manager.from_queryset(SoftDeletableQuerySet)):
    """Manager returning only active (non-soft-deleted) records by default."""

    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)


class AllObjectsManager(models.Manager.from_queryset(SoftDeletableQuerySet)):
    """Manager including both active and soft-deleted records."""


class SoftDeletableModel(models.Model):
    """Abstract base model supporting soft deletion."""

    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)

    objects = SoftDeletableManager()
    all_objects = AllObjectsManager()

    class Meta:
        abstract = True

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None

    def soft_delete(self):
        """Mark the instance as deleted."""
        self.deleted_at = timezone.now()
        self.save(update_fields=["deleted_at"])

    def restore(self):
        """Restore a soft-deleted instance."""
        self.deleted_at = None
        self.save(update_fields=["deleted_at"])

    def hard_delete(self, using=None, keep_parents=False):
        """Permanently delete from database."""
        return super().delete(using=using, keep_parents=keep_parents)


class ShopScopedBaseModel(UUIDModel, TimeStampedModel, SoftDeletableModel):
    """
    Standard base model for all tenant-scoped business entities.
    Enforces shop_id, optimistic locking version, created_by_id, and soft delete.
    """

    shop_id = models.UUIDField(db_index=True, help_text="Tenant identifier (Shop FK)")
    created_by_id = models.UUIDField(null=True, blank=True, help_text="User ID of author")
    version = models.PositiveIntegerField(default=1, help_text="Optimistic concurrency locking version")

    class Meta:
        abstract = True
        indexes = (models.Index(fields=["shop_id", "created_at"]),)
