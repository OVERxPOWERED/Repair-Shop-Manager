"""
SMS providers. Production uses a DLT-registered provider (1.19).
Console provider never prints codes outside DEBUG.
"""

import logging
from typing import Protocol

from django.conf import settings
from django.utils.module_loading import import_string

from apps.core.phone import mask_phone

logger = logging.getLogger("fixpro.sms")


class SmsProvider(Protocol):
    def send_otp(self, *, phone: str, code: str) -> None: ...

    def send_text(self, *, phone: str, body: str, template_id: str | None = None) -> str: ...


class ConsoleSmsProvider:
    def send_otp(self, *, phone: str, code: str) -> None:
        if settings.DEBUG:
            logger.warning("[DEV SMS] OTP for %s is %s", phone, code)
        else:
            logger.info("[console sms] OTP generated for %s (code hidden outside DEBUG)", mask_phone(phone))

    def send_text(self, *, phone: str, body: str, template_id: str | None = None) -> str:
        if settings.DEBUG:
            logger.warning("[DEV SMS] to %s: %s", phone, body)
        else:
            logger.info("[console sms] message to %s (body hidden)", mask_phone(phone))
        return "console"


def get_sms_provider() -> SmsProvider:
    return import_string(settings.SMS_PROVIDER)()
