import secrets

from django.conf import settings
from django.db import models

from apps.core.models import ShopScopedModel, TimeStampedModel, UUIDModel


def new_tracking_token() -> str:
    return secrets.token_urlsafe(24)  # 192 bits, 32 URL-safe characters


class JobStatus(models.TextChoices):
    RECEIVED = "received"
    DIAGNOSING = "diagnosing"
    AWAITING_APPROVAL = "awaiting_approval"
    AWAITING_PARTS = "awaiting_parts"
    IN_REPAIR = "in_repair"
    REPAIRED = "repaired"
    READY_FOR_PICKUP = "ready_for_pickup"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    RETURNED_UNREPAIRED = "returned_unrepaired"


class JobCounter(models.Model):
    shop = models.OneToOneField("tenancy.Shop", on_delete=models.PROTECT, primary_key=True, related_name="+")
    last_job_no = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"JobCounter({self.shop_id}: {self.last_job_no})"


class Job(ShopScopedModel):
    class Kind(models.TextChoices):
        FULL = "full"
        ROUGH = "rough"  # Rough Reg UI arrives in Phase 2

    class Priority(models.TextChoices):
        LOW = "low"
        NORMAL = "normal"
        URGENT = "urgent"

    class Source(models.TextChoices):
        WALK_IN = "walk_in"
        PHONE = "phone"
        SITE_LEAD = "site_lead"

    class LockType(models.TextChoices):
        NONE = "none"
        PIN = "pin"
        PATTERN = "pattern"
        PASSWORD = "password"

    job_no = models.PositiveIntegerField()
    kind = models.CharField(max_length=10, choices=Kind.choices, default=Kind.FULL)
    customer = models.ForeignKey("customers.Customer", on_delete=models.PROTECT, related_name="jobs")
    device = models.ForeignKey("devices.Device", on_delete=models.PROTECT, related_name="jobs")
    assigned_to = models.ForeignKey(
        "tenancy.Membership", on_delete=models.PROTECT, null=True, blank=True, related_name="assigned_jobs"
    )
    status = models.CharField(max_length=24, choices=JobStatus.choices, default=JobStatus.RECEIVED)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.NORMAL)
    source = models.CharField(max_length=12, choices=Source.choices, default=Source.WALK_IN)
    fault_description = models.TextField()
    device_condition = models.TextField(blank=True, default="")
    condition_tags = models.JSONField(default=list, blank=True)  # e.g. ["screen_cracked", "water_damage"]
    lock_type = models.CharField(max_length=10, choices=LockType.choices, default=LockType.NONE)
    lock_value_enc = models.BinaryField(null=True, blank=True)
    estimate_paise = models.BigIntegerField(default=0)
    expected_date = models.DateField(null=True, blank=True)
    received_at = models.DateTimeField()
    ready_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    delivered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="+"
    )
    warranty_days = models.PositiveIntegerField(default=0)
    warranty_until = models.DateField(null=True, blank=True)
    tracking_token = models.CharField(max_length=64, unique=True, default=new_tracking_token)
    is_locked = models.BooleanField(default=False)
    cancel_reason = models.TextField(blank=True, default="")
    total_paise = models.BigIntegerField(default=0)  # cached from line items (1.11)
    cost_paise = models.BigIntegerField(default=0)  # cached; visible only with money.see_cost_profit

    class Meta:
        constraints = [models.UniqueConstraint(fields=["shop", "job_no"], name="job_uniq_no_per_shop")]
        indexes = [
            models.Index(fields=["shop", "status", "-updated_at"], name="job_shop_status_idx"),
            models.Index(fields=["shop", "assigned_to", "status"], name="job_shop_assignee_idx"),
            models.Index(fields=["shop", "customer"], name="job_shop_customer_idx"),
            models.Index(fields=["shop", "-created_at"], name="job_shop_created_idx"),
        ]

    def __str__(self):
        return f"#{self.job_no} ({self.status})"


class JobAccessory(UUIDModel):
    shop = models.ForeignKey("tenancy.Shop", on_delete=models.PROTECT, related_name="+")
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name="accessories")
    name = models.CharField(max_length=60)

    def __str__(self):
        return f"{self.name} (Job #{self.job.job_no})"


class JobNote(ShopScopedModel):
    class Visibility(models.TextChoices):
        INTERNAL = "internal"
        CUSTOMER = "customer"  # shown on the tracking page (1.18)

    job = models.ForeignKey(Job, on_delete=models.PROTECT, related_name="notes")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    body = models.TextField()
    visibility = models.CharField(max_length=10, choices=Visibility.choices, default=Visibility.INTERNAL)

    def __str__(self):
        return f"Note on #{self.job.job_no} by {self.author_id}"


class JobStatusHistory(UUIDModel, TimeStampedModel):
    """Append-only (no update/delete code paths)."""

    shop = models.ForeignKey("tenancy.Shop", on_delete=models.PROTECT, related_name="+")
    job = models.ForeignKey(Job, on_delete=models.PROTECT, related_name="status_history")
    from_status = models.CharField(max_length=24, blank=True, default="")
    to_status = models.CharField(max_length=24)
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    changed_at = models.DateTimeField()
    note = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["changed_at"]

    def __str__(self):
        return f"#{self.job.job_no}: {self.from_status} -> {self.to_status}"


class JobPhoto(ShopScopedModel):
    class Kind(models.TextChoices):
        BEFORE = "before"
        AFTER = "after"
        DAMAGE = "damage"
        OTHER = "other"

    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name="photos")
    file_key = models.CharField(max_length=255)
    kind = models.CharField(max_length=12, choices=Kind.choices, default=Kind.BEFORE)
    caption = models.CharField(max_length=255, blank=True, default="")
    size_bytes = models.PositiveIntegerField()
    width = models.PositiveIntegerField()
    height = models.PositiveIntegerField()
    taken_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")

    class Meta:
        indexes = [
            models.Index(fields=["shop", "job"], name="job_photo_shop_job_idx"),
        ]

    def __str__(self):
        return f"Photo {self.kind} on #{self.job.job_no} ({self.file_key})"
