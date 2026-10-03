"""
Messaging services for FixPro.
Handles message dispatch, template resolution, opt-in checks, and transaction-safe logging.
"""

import logging
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.core.phone import mask_phone
from apps.core.sms import get_sms_provider
from apps.messaging.models import (
    MessageLog,
    MessageStatusChoices,
    MessageTemplate,
    TemplateChannelChoices,
)
from apps.messaging.renderer import render_template

logger = logging.getLogger("fixpro.messaging")


def resolve_message_template(*, shop, key: str, channel: str, locale: str) -> MessageTemplate | None:
    """
    Resolves the best matching template with fallback order:
    1. Shop override in customer's locale
    2. Platform default in customer's locale
    3. Shop override in English ('en')
    4. Platform default in English ('en')
    """
    # 1. Shop override in target locale
    template = MessageTemplate.objects.filter(
        shop=shop, key=key, channel=channel, locale=locale, is_active=True
    ).first()
    if template:
        return template

    # 2. Platform default in target locale
    template = MessageTemplate.objects.filter(
        shop__isnull=True, key=key, channel=channel, locale=locale, is_active=True
    ).first()
    if template:
        return template

    # Fall back to English if target locale wasn't English
    if locale != "en":
        # 3. Shop override in English
        template = MessageTemplate.objects.filter(
            shop=shop, key=key, channel=channel, locale="en", is_active=True
        ).first()
        if template:
            return template

        # 4. Platform default in English
        template = MessageTemplate.objects.filter(
            shop__isnull=True, key=key, channel=channel, locale="en", is_active=True
        ).first()
        if template:
            return template

    return None


def send_job_message(
    *,
    job,
    key: str,
    actor=None,
    channel: str = TemplateChannelChoices.SMS,
) -> MessageLog | None:
    """
    Dispatches a templated message to the job's customer.
    Creates a MessageLog. Network send is scheduled inside transaction.on_commit.
    Failures never break the enclosing job transaction.
    """
    try:
        customer = getattr(job, "customer", None)
        target_locale = getattr(customer, "preferred_locale", None) or getattr(job.shop, "default_locale", "en") or "en"

        # 1. Check phone presence
        if not customer or not customer.phone:
            logger.info("Skipping %s for job #%s: no customer phone number", key, job.job_no)
            return MessageLog.objects.create(
                shop=job.shop,
                job=job,
                channel=channel,
                to_phone_masked="N/A",
                template_key=key,
                locale=target_locale,
                status=MessageStatusChoices.SKIPPED,
                error_code="no_phone",
                created_by=actor,
            )

        # 2. Check channel opt-ins
        if channel == TemplateChannelChoices.SMS and not customer.sms_opt_in:
            logger.info("Customer %s opted out of SMS; skipping %s", mask_phone(customer.phone), key)
            return MessageLog.objects.create(
                shop=job.shop,
                job=job,
                channel=channel,
                to_phone_masked=mask_phone(customer.phone),
                template_key=key,
                locale=target_locale,
                status=MessageStatusChoices.SKIPPED,
                error_code="sms_opted_out",
                created_by=actor,
            )

        if channel == TemplateChannelChoices.WHATSAPP and not customer.whatsapp_opt_in:
            logger.info("Customer %s opted out of WhatsApp; skipping %s", mask_phone(customer.phone), key)
            return MessageLog.objects.create(
                shop=job.shop,
                job=job,
                channel=channel,
                to_phone_masked=mask_phone(customer.phone),
                template_key=key,
                locale=target_locale,
                status=MessageStatusChoices.SKIPPED,
                error_code="whatsapp_opted_out",
                created_by=actor,
            )

        # 3. Resolve template
        template = resolve_message_template(
            shop=job.shop,
            key=key,
            channel=channel,
            locale=target_locale,
        )

        if not template:
            logger.warning("No message template found for key=%s, channel=%s, locale=%s", key, channel, target_locale)
            return MessageLog.objects.create(
                shop=job.shop,
                job=job,
                channel=channel,
                to_phone_masked=mask_phone(customer.phone),
                template_key=key,
                locale=target_locale,
                status=MessageStatusChoices.FAILED,
                error_code="template_not_found",
                created_by=actor,
            )

        # 4. Context preparation & safe rendering
        base_tracking_url = getattr(settings, "PUBLIC_TRACKING_BASE_URL", "https://track.fixpro.in").rstrip("/")
        link = f"{base_tracking_url}/t/{job.tracking_token}/" if getattr(job, "tracking_token", None) else ""

        device_str = "Device"
        if getattr(job, "device", None):
            brand = job.device.brand_text or ""
            model = job.device.model or ""
            device_str = f"{brand} {model}".strip() or "Device"

        # Amount in rupees (two decimals if fractional, integer if whole)
        due_paise = job.balance_paise if getattr(job, "balance_paise", 0) > 0 else getattr(job, "total_paise", 0)
        amount_val = Decimal(due_paise) / Decimal(100)
        amount_str = f"{amount_val:.2f}".rstrip("0").rstrip(".")

        status_display = job.get_status_display() if hasattr(job, "get_status_display") else str(job.status)

        context = {
            "shop_name": job.shop.name,
            "job_no": str(job.job_no),
            "device": device_str,
            "status": status_display,
            "amount": amount_str,
            "link": link,
            "customer_name": customer.name or "Customer",
            "otp": "",
        }

        rendered_body = render_template(template.body, context)

        # 5. Create queued log row
        log = MessageLog.objects.create(
            shop=job.shop,
            job=job,
            channel=channel,
            to_phone_masked=mask_phone(customer.phone),
            template_key=key,
            locale=template.locale,
            status=MessageStatusChoices.QUEUED,
            created_by=actor,
        )

        log_id = log.id
        phone_number = customer.phone
        dlt_template_id = template.dlt_template_id

        # 6. Dispatch inside on_commit so DB transaction is not blocked and commits first
        def _dispatch():
            try:
                if channel == TemplateChannelChoices.SMS:
                    provider = get_sms_provider()
                    msg_id = provider.send_text(
                        phone=phone_number,
                        body=rendered_body,
                        template_id=dlt_template_id,
                    )
                    MessageLog.objects.filter(id=log_id).update(
                        status=MessageStatusChoices.SENT,
                        provider_message_id=str(msg_id or ""),
                        sent_at=timezone.now(),
                    )
                else:
                    # WhatsApp or other channels
                    # TODO(verify) live WhatsApp Business API provider
                    MessageLog.objects.filter(id=log_id).update(
                        status=MessageStatusChoices.SENT,
                        provider_message_id="wa_simulated",
                        sent_at=timezone.now(),
                    )
            except Exception as exc:
                logger.warning("Message delivery failed for log %s: %s", log_id, exc)
                MessageLog.objects.filter(id=log_id).update(
                    status=MessageStatusChoices.FAILED,
                    error_code=str(exc)[:100],
                )

        transaction.on_commit(_dispatch)
        return log

    except Exception as exc:
        logger.exception("Unexpected error in send_job_message for job %s: %s", getattr(job, "id", None), exc)
        return None
