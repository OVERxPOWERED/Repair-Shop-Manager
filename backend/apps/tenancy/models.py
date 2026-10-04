"""
Tenancy models for FixPro: Organization, Shop, Role, Membership, and Invite.
Implements the multi-tenant scoping boundary and role-based access control.
"""

from django.conf import settings
from django.db import models
from django.db.models.functions import Lower
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.core.choices import DeviceCategory
from apps.core.models import ShopScopedModel, SoftDeletableModel, TimeStampedModel, UUIDModel


class Organization(UUIDModel, TimeStampedModel, SoftDeletableModel):
    """
    Parent umbrella organization owned by a shop owner.
    In single-shop mode, 1 organization = 1 shop.
    In multi-branch mode, 1 organization contains multiple branch shops.
    """

    class StatusChoices(models.TextChoices):
        ACTIVE = "active", _("Active")
        SUSPENDED = "suspended", _("Suspended")
        CLOSED = "closed", _("Closed")

    name = models.CharField(max_length=150)
    owner_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="owned_organizations"
    )
    status = models.CharField(max_length=20, choices=StatusChoices.choices, default=StatusChoices.ACTIVE)

    class Meta:
        verbose_name = _("Organization")
        verbose_name_plural = _("Organizations")
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class Shop(UUIDModel, TimeStampedModel, SoftDeletableModel):
    """
    The tenant boundary itself. Every business entity (jobs, customers, devices, invoices)
    belongs strictly to one Shop via shop_id.
    """

    class ShopTypeChoices(models.TextChoices):
        MOBILE = "mobile", _("Mobile Repair")
        COMPUTER = "computer", _("Computer & Laptop Repair")
        TV_APPLIANCE = "tv_appliance", _("TV & Appliance Repair")
        OTHER = "other", _("Other Repair Workshop")

    class RegistrationTypeChoices(models.TextChoices):
        REGULAR = "regular", _("Regular GST")
        COMPOSITION = "composition", _("Composition Scheme")
        UNREGISTERED = "unregistered", _("Unregistered / Non-GST")

    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="shops")
    name = models.CharField(max_length=150)
    shop_type = models.CharField(max_length=20, choices=ShopTypeChoices.choices, default=ShopTypeChoices.MOBILE)
    phone = models.CharField(max_length=16, help_text="Public shop contact number")
    address_line1 = models.TextField(blank=True, default="")
    address_line2 = models.TextField(blank=True, default="")
    city = models.CharField(max_length=100, blank=True, default="")
    pincode = models.CharField(max_length=10, blank=True, default="")
    state_code = models.CharField(max_length=2, blank=True, default="", help_text="2-digit GST state code (e.g. '27')")
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    logo_key = models.TextField(null=True, blank=True, help_text="Storage object key for shop logo")
    timezone = models.CharField(max_length=40, default="Asia/Kolkata")
    default_locale = models.CharField(max_length=8, default="en")

    # Tax & Invoicing Configuration
    gst_enabled = models.BooleanField(default=False, help_text="Per-shop GST calculation toggle")
    gstin = models.CharField(max_length=15, null=True, blank=True, help_text="15-character GSTIN number")
    registration_type = models.CharField(
        max_length=20, choices=RegistrationTypeChoices.choices, default=RegistrationTypeChoices.UNREGISTERED
    )
    upi_id = models.CharField(max_length=100, null=True, blank=True, help_text="VPA UPI ID for on-bill QR payment")
    invoice_prefix = models.CharField(max_length=8, default="INV")
    round_off_enabled = models.BooleanField(default=True)
    default_terms = models.TextField(
        blank=True, default="", help_text="Default terms and conditions printed on invoices and receipts"
    )

    # Operational Policies
    lock_order_after_delivery = models.BooleanField(
        default=False, help_text="Prevent edits to job details once status reaches Delivered"
    )
    engineers_see_assigned_only = models.BooleanField(
        default=False, help_text="Restrict technician visibility to jobs assigned directly to them"
    )
    mask_phone_for_engineers = models.BooleanField(
        default=False, help_text="Mask customer phone numbers from technicians"
    )
    default_warranty_days = models.PositiveIntegerField(default=30)
    tracking_enabled = models.BooleanField(default=True)
    tracking_expiry_days = models.PositiveIntegerField(
        default=30, help_text="Days after delivery customer web tracking token remains active"
    )
    auto_sms_events = models.JSONField(
        default=list, blank=True, help_text="List of events that trigger automated customer SMS"
    )
    version = models.PositiveIntegerField(default=1)

    class Meta:
        verbose_name = _("Shop")
        verbose_name_plural = _("Shops")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.city or 'Main'})"


class Role(UUIDModel):
    """
    Role definition carrying a set of granular permission codes.
    Can be system-wide (organization is null) or custom per organization.
    """

    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, null=True, blank=True, related_name="roles"
    )
    name = models.CharField(max_length=50)
    is_system = models.BooleanField(default=False)
    permissions = models.JSONField(default=list, help_text="List of permission code strings")

    class Meta:
        verbose_name = _("Role")
        verbose_name_plural = _("Roles")
        unique_together = ("organization", "name")
        ordering = ["name"]

    def __str__(self):
        return f"{self.name}{' (System)' if self.is_system else ''}"


class Membership(UUIDModel, TimeStampedModel):
    """
    Links a User to a specific Shop with a granted Role.
    Controls access and status inside each shop branch.
    """

    class StatusChoices(models.TextChoices):
        INVITED = "invited", _("Invited")
        ACTIVE = "active", _("Active")
        SUSPENDED = "suspended", _("Suspended")
        REMOVED = "removed", _("Removed")

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="memberships")
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name="memberships")
    role = models.ForeignKey(Role, on_delete=models.PROTECT, related_name="memberships")
    status = models.CharField(max_length=20, choices=StatusChoices.choices, default=StatusChoices.ACTIVE)
    display_name = models.CharField(max_length=120, blank=True, default="")
    pin_hash = models.CharField(max_length=128, null=True, blank=True)
    pin_attempts = models.PositiveSmallIntegerField(default=0)
    pin_locked_until = models.DateTimeField(null=True, blank=True)
    joined_at = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = _("Membership")
        verbose_name_plural = _("Memberships")
        constraints = [
            models.UniqueConstraint(
                fields=["user", "shop"], condition=~models.Q(status="removed"), name="membership_uniq_live"
            ),
        ]
        indexes = [
            models.Index(fields=["shop", "status"]),
            models.Index(fields=["user", "status"]),
        ]

    def has_perm(self, code: str) -> bool:
        return self.status == self.StatusChoices.ACTIVE and code in (self.role.permissions or [])

    def __str__(self):
        return f"{self.user.phone} @ {self.shop.name} ({self.role.name})"


class Invite(UUIDModel, TimeStampedModel):
    """
    Pending invitation to join a shop.
    Sent via SMS to a technician or front-desk staff member.
    """

    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name="invites")
    phone = models.CharField(max_length=16)
    role = models.ForeignKey(Role, on_delete=models.PROTECT)
    token_hash = models.CharField(max_length=128)
    expires_at = models.DateTimeField()
    accepted_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="sent_invites"
    )

    class Meta:
        verbose_name = _("Shop Invite")
        verbose_name_plural = _("Shop Invites")
        indexes = [
            models.Index(fields=["shop", "phone"]),
        ]

    @property
    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at

    @property
    def is_accepted(self) -> bool:
        return self.accepted_at is not None


class ShopBrand(ShopScopedModel):
    device_category = models.CharField(max_length=20, choices=DeviceCategory.choices)
    name = models.CharField(max_length=60)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveSmallIntegerField(default=100)

    class Meta:
        ordering = ["sort_order", "name"]
        constraints = [
            models.UniqueConstraint(
                Lower("name"),
                "shop",
                "device_category",
                condition=models.Q(deleted_at__isnull=True),
                name="brand_uniq_name_per_cat",
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.device_category})"


class AccessoryOption(ShopScopedModel):
    name = models.CharField(max_length=60)
    is_default = models.BooleanField(default=False)  # pre-ticked in the intake checklist
    sort_order = models.PositiveSmallIntegerField(default=100)

    class Meta:
        ordering = ["sort_order", "name"]

    def __str__(self):
        return self.name
