"""
Accounts models for FixPro: User, OTPChallenge, UserDevice, and AccountDeletionRequest.
Implements phone-based authentication, device tracking, and privacy workflows.
"""

import uuid

from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.core.models import SoftDeletableModel, TimeStampedModel, UUIDModel


class UserManager(BaseUserManager):
    """Custom manager using phone number as unique username identifier."""

    def create_user(self, phone, password=None, **extra_fields):
        if not phone:
            raise ValueError(_("The phone number must be provided"))
        phone = phone.strip()
        user = self.model(phone=phone, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, phone, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_platform_admin", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError(_("Superuser must have is_staff=True."))
        if extra_fields.get("is_superuser") is not True:
            raise ValueError(_("Superuser must have is_superuser=True."))

        return self.create_user(phone, password=password, **extra_fields)


class User(UUIDModel, TimeStampedModel, SoftDeletableModel, AbstractBaseUser, PermissionsMixin):
    """
    Global user identity. Identifies technicians, front-desk staff, managers, and shop owners.
    Identified primarily by E.164 phone number.
    """

    class LocaleChoices(models.TextChoices):
        ENGLISH = "en", _("English")
        HINDI = "hi", _("Hindi")
        HINGLISH = "hi-Latn", _("Hinglish")

    phone = models.CharField(max_length=16, unique=True, db_index=True, help_text="E.164 phone number")
    name = models.CharField(max_length=120, blank=True, default="")
    email = models.EmailField(blank=True, null=True)
    preferred_locale = models.CharField(
        max_length=8, choices=LocaleChoices.choices, default=LocaleChoices.ENGLISH, help_text="UI language preference"
    )
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_platform_admin = models.BooleanField(default=False, help_text="Superadmin/Support role across all shops")
    last_login_at = models.DateTimeField(null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD = "phone"
    REQUIRED_FIELDS = []

    class Meta:
        verbose_name = _("User")
        verbose_name_plural = _("Users")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name or 'User'} ({self.phone})"


class OTPChallenge(UUIDModel):
    """
    One-Time Password challenge issued for phone authentication and verification.
    Stores cryptographic hash of the 6-digit code with expiry and rate-limiting counters.
    """

    class PurposeChoices(models.TextChoices):
        LOGIN = "login", _("Login")
        PHONE_CHANGE = "phone_change", _("Phone Change")

    phone = models.CharField(max_length=16, db_index=True)
    code_hash = models.CharField(max_length=128, help_text="Hashed OTP code")
    purpose = models.CharField(max_length=20, choices=PurposeChoices.choices, default=PurposeChoices.LOGIN)
    expires_at = models.DateTimeField(db_index=True)
    attempts = models.PositiveSmallIntegerField(default=0)
    max_attempts = models.PositiveSmallIntegerField(default=3)
    consumed_at = models.DateTimeField(null=True, blank=True)
    ip = models.GenericIPAddressField(null=True, blank=True)
    device_id = models.CharField(max_length=128, blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        verbose_name = _("OTP Challenge")
        verbose_name_plural = _("OTP Challenges")
        indexes = [
            models.Index(fields=["phone", "-created_at"]),
        ]
        ordering = ["-created_at"]

    @property
    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at

    @property
    def is_consumed(self) -> bool:
        return self.consumed_at is not None

    @property
    def is_blocked(self) -> bool:
        return self.attempts >= self.max_attempts


class UserDevice(UUIDModel):
    """
    Device session registered for a user.
    Tracks active devices, push notification tokens, and refresh token families.
    """

    class PlatformChoices(models.TextChoices):
        ANDROID = "android", _("Android")
        IOS = "ios", _("iOS")
        WEB = "web", _("Web")

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="devices")
    device_id = models.CharField(max_length=128)
    platform = models.CharField(max_length=10, choices=PlatformChoices.choices, default=PlatformChoices.WEB)
    app_version = models.CharField(max_length=32, blank=True, default="")
    push_token = models.TextField(null=True, blank=True)
    last_seen_at = models.DateTimeField(default=timezone.now)
    revoked_at = models.DateTimeField(null=True, blank=True)
    refresh_family = models.UUIDField(default=uuid.uuid4, help_text="Token family for refresh token reuse detection")

    class Meta:
        verbose_name = _("User Device")
        verbose_name_plural = _("User Devices")
        unique_together = ("user", "device_id")
        indexes = [
            models.Index(fields=["user", "last_seen_at"]),
        ]

    def __str__(self):
        return f"{self.user.phone} - {self.platform} ({self.device_id[:8]})"


class AccountDeletionRequest(UUIDModel):
    """
    Mandatory compliance queue for Apple/Google store account deletion guidelines.
    Anonymizes user row after scheduled grace period.
    """

    class StatusChoices(models.TextChoices):
        PENDING = "pending", _("Pending")
        CANCELLED = "cancelled", _("Cancelled")
        COMPLETED = "completed", _("Completed")

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="deletion_requests")
    requested_at = models.DateTimeField(default=timezone.now)
    scheduled_for = models.DateTimeField()
    status = models.CharField(max_length=20, choices=StatusChoices.choices, default=StatusChoices.PENDING)
    completed_at = models.DateTimeField(null=True, blank=True)
    reason = models.TextField(blank=True, default="")

    class Meta:
        verbose_name = _("Account Deletion Request")
        verbose_name_plural = _("Account Deletion Requests")
