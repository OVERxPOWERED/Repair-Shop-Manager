"""
Abstract base models and managers for FixPro.
Enforces UUID primary keys, timestamps, soft-deletion, and tenant scoping.
"""

import uuid

from django.conf import settings
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
    """QuerySet whose delete() is a soft delete. Use hard_delete() for permanent removal."""

    def alive(self):
        return self.filter(deleted_at__isnull=True)

    def dead(self):
        return self.filter(deleted_at__isnull=False)

    def delete(self):
        now = timezone.now()
        values = {"deleted_at": now}
        if any(f.name == "updated_at" for f in self.model._meta.concrete_fields):
            values["updated_at"] = now
        return self.update(**values)

    def hard_delete(self):
        return super().delete()


class SoftDeletableManager(models.Manager.from_queryset(SoftDeletableQuerySet)):
    """Default manager: hides soft-deleted rows."""

    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)


class AllObjectsManager(models.Manager.from_queryset(SoftDeletableQuerySet)):
    """Includes soft-deleted rows (trash, restore, admin)."""


class SoftDeletableModel(models.Model):
    """Rows are never removed by delete(); they get a deleted_at timestamp instead."""

    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)

    objects = SoftDeletableManager()
    all_objects = AllObjectsManager()

    class Meta:
        abstract = True

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None

    def _save_deletion_state(self):
        fields = ["deleted_at"]
        if hasattr(self, "updated_at"):
            fields.append("updated_at")
        self.save(update_fields=fields)

    def soft_delete(self):
        self.deleted_at = timezone.now()
        self._save_deletion_state()

    def restore(self):
        self.deleted_at = None
        self._save_deletion_state()

    def delete(self, using=None, keep_parents=False):
        """Soft delete. Django admin, DRF destroy and obj.delete() all end up here."""
        self.soft_delete()
        return 0, {}

    def hard_delete(self, using=None, keep_parents=False):
        """Permanent delete. Only for purge jobs and permission-gated 'delete permanently'."""
        return models.Model.delete(self, using=using, keep_parents=keep_parents)


class ShopScopedQuerySet(SoftDeletableQuerySet):
    def for_shop(self, shop):
        return self.filter(shop=shop)


class ShopScopedManager(models.Manager.from_queryset(ShopScopedQuerySet)):
    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)


class AllShopScopedManager(models.Manager.from_queryset(ShopScopedQuerySet)):
    pass


class ShopScopedModel(UUIDModel, TimeStampedModel, SoftDeletableModel):
    """
    Base class for every business table (AGENTS.md rule 1 and 3).
    Real foreign key to tenancy.Shop, author, optimistic-concurrency version, soft delete.
    Subclasses declare their own Meta.indexes / constraints (see ROADMAP Recipe R1).
    """

    shop = models.ForeignKey("tenancy.Shop", on_delete=models.PROTECT, related_name="+")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="+"
    )
    version = models.PositiveIntegerField(default=1)

    objects = ShopScopedManager()
    all_objects = AllShopScopedManager()

    class Meta:
        abstract = True
