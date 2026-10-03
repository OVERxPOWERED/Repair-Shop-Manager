"""
MSG91 SMS provider implementation.
Compliant with TRAI DLT regulations in India.
Uses httpx with a strict 10-second timeout.
Masks phone numbers in all logging.
"""

import logging
from typing import Any

import httpx
from django.conf import settings

from apps.core.phone import mask_phone

logger = logging.getLogger("fixpro.sms.msg91")

MSG91_FLOW_URL = "https://control.msg91.com/api/v5/flow/"
MSG91_OTP_URL = "https://control.msg91.com/api/v5/otp"


class Msg91SmsProvider:
    """
    SMS provider using MSG91 flow and OTP APIs.
    Requires DLT-approved template IDs.
    """

    def __init__(self):
        self.api_key = getattr(settings, "SMS_API_KEY", "")
        self.sender_id = getattr(settings, "SMS_SENDER_ID", "FIXPRO")
        self.dlt_otp_template_id = getattr(settings, "SMS_DLT_OTP_TE_ID", "")
        self.timeout = 10.0

    def _clean_phone_for_msg91(self, phone: str) -> str:
        # MSG91 expects format with country code without plus sign (e.g. '919876543210')
        digits = "".join(filter(str.isdigit, phone))
        if len(digits) == 10:
            digits = "91" + digits
        return digits

    def send_text(self, *, phone: str, body: str, template_id: str | None = None) -> str:
        """
        Sends transactional/service SMS via MSG91 flow API.
        Returns provider message ID.
        """
        clean_phone = self._clean_phone_for_msg91(phone)
        masked = mask_phone(phone)

        if not self.api_key:
            logger.warning(
                "[MSG91 DRY-RUN] No SMS_API_KEY set. Simulated send to %s (body length: %d)",
                masked,
                len(body),
            )
            return "msg91_simulated_id"

        headers = {
            "authkey": self.api_key,
            "content-type": "application/json",
            "accept": "application/json",
        }

        # TODO(verify) matches MSG91 DLT flow schema for registered entity
        payload: dict[str, Any] = {
            "template_id": template_id or "",
            "short_url": "0",
            "recipients": [
                {
                    "mobiles": clean_phone,
                    "body": body,
                }
            ],
        }

        try:
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.post(MSG91_FLOW_URL, json=payload, headers=headers)
                resp.raise_for_status()
                data = resp.json()

                msg_id = data.get("message") or data.get("request_id") or "msg91_sent"
                logger.info("[MSG91] SMS successfully sent to %s (message_id=%s)", masked, msg_id)
                return str(msg_id)
        except Exception as exc:
            logger.error("[MSG91] Failed to send SMS to %s: %s", masked, exc)
            raise

    def send_otp(self, *, phone: str, code: str) -> None:
        """
        Sends login / verification OTP via MSG91 OTP API.
        """
        clean_phone = self._clean_phone_for_msg91(phone)
        masked = mask_phone(phone)

        if not self.api_key:
            if settings.DEBUG:
                logger.warning("[DEV MSG91] OTP for %s is %s", masked, code)
            else:
                logger.info("[MSG91 DRY-RUN] OTP generated for %s (code hidden)", masked)
            return

        headers = {
            "authkey": self.api_key,
            "content-type": "application/json",
        }

        # TODO(verify) matches MSG91 OTP endpoint parameters
        payload = {
            "mobile": clean_phone,
            "otp": code,
        }
        if self.dlt_otp_template_id:
            payload["template_id"] = self.dlt_otp_template_id

        try:
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.post(MSG91_OTP_URL, json=payload, headers=headers)
                resp.raise_for_status()
                logger.info("[MSG91] OTP sent to %s", masked)
        except Exception as exc:
            logger.error("[MSG91] Failed to send OTP to %s: %s", masked, exc)
            raise
