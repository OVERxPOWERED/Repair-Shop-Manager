from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import ShopScopedModel, TimeStampedModel, UUIDModel


class TemplateChannelChoices(models.TextChoices):
    SMS = "sms", _("SMS")
    WHATSAPP = "whatsapp", _("WhatsApp")


class TemplateKeyChoices(models.TextChoices):
    JOB_RECEIVED = "job_received", _("Job Received")
    STATUS_UPDATE = "status_update", _("Status Update")
    READY_FOR_PICKUP = "ready_for_pickup", _("Ready for Pickup")
    DELIVERED = "delivered", _("Delivered")
    INVOICE = "invoice", _("Invoice")
    OTP = "otp", _("OTP")


class MessageStatusChoices(models.TextChoices):
    QUEUED = "queued", _("Queued")
    SENT = "sent", _("Sent")
    DELIVERED = "delivered", _("Delivered")
    FAILED = "failed", _("Failed")
    SKIPPED = "skipped", _("Skipped")


class MessageTemplate(UUIDModel, TimeStampedModel):
    """
    Template for SMS and WhatsApp messages.
    shop=null represents platform-wide defaults.
    Shops can override WhatsApp templates. SMS bodies remain DLT-approved.
    """

    shop = models.ForeignKey(
        "tenancy.Shop",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="message_templates",
    )
    key = models.CharField(max_length=40, choices=TemplateKeyChoices.choices)
    channel = models.CharField(
        max_length=20, choices=TemplateChannelChoices.choices, default=TemplateChannelChoices.SMS
    )
    locale = models.CharField(max_length=10, default="en")
    body = models.TextField()
    dlt_template_id = models.CharField(max_length=50, null=True, blank=True)
    wa_template_name = models.CharField(max_length=100, null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["key", "channel", "locale"]
        constraints = [
            models.UniqueConstraint(
                fields=["shop", "key", "channel", "locale"],
                condition=models.Q(shop__isnull=False),
                name="uniq_shop_message_template",
            ),
            models.UniqueConstraint(
                fields=["key", "channel", "locale"],
                condition=models.Q(shop__isnull=True),
                name="uniq_platform_message_template",
            ),
        ]

    def __str__(self):
        scope = self.shop.name if self.shop else "Platform Default"
        return f"{self.key} ({self.channel}/{self.locale}) - {scope}"


class MessageLog(ShopScopedModel):
    """
    Immutable log of every message dispatched, skipped, or failed.
    Always stores masked phone numbers (+91XXXXXX3210), never raw numbers.
    """

    channel = models.CharField(
        max_length=20, choices=TemplateChannelChoices.choices, default=TemplateChannelChoices.SMS
    )
    to_phone_masked = models.CharField(max_length=20)
    template_key = models.CharField(max_length=40)
    locale = models.CharField(max_length=10, default="en")
    job = models.ForeignKey(
        "jobs.Job",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="message_logs",
    )
    status = models.CharField(
        max_length=20,
        choices=MessageStatusChoices.choices,
        default=MessageStatusChoices.QUEUED,
    )
    provider_message_id = models.CharField(max_length=100, blank=True, default="")
    error_code = models.CharField(max_length=100, blank=True, default="")
    cost_paise = models.PositiveIntegerField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["shop", "created_at"]),
            models.Index(fields=["job", "created_at"]),
        ]

    def __str__(self):
        return f"{self.channel} to {self.to_phone_masked} [{self.template_key}]: {self.status}"
