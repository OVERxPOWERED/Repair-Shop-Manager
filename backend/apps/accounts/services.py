"""
Authentication and OTP lifecycle services for FixPro.
Handles OTP generation, hashing, rate limiting, and token issuance.
"""

import hashlib
import logging
import os
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import OTPChallenge, UserDevice

logger = logging.getLogger(__name__)
User = get_user_model()

OTP_EXPIRY_MINUTES = 5
OTP_COOLDOWN_SECONDS = 30
MAX_HOURLY_CHALLENGES = 6


def _hash_otp(code: str, salt: str = "fixpro-otp") -> str:
    """Hash OTP using SHA-256 with salt."""
    return hashlib.sha256(f"{salt}:{code}".encode()).hexdigest()


def send_otp_challenge(
    phone: str, purpose: str = OTPChallenge.PurposeChoices.LOGIN, device_id: str | None = None, ip: str | None = None
) -> tuple[OTPChallenge, int]:
    """
    Generate and deliver a 6-digit OTP challenge.
    Enforces cooldown and hourly rate limits.
    Returns (challenge_instance, cooldown_seconds).
    """
    phone = phone.strip()
    now = timezone.now()

    # 1. Check cooldown (minimum 30 seconds since last challenge)
    latest_challenge = OTPChallenge.objects.filter(phone=phone).order_by("-created_at").first()
    if latest_challenge:
        elapsed = (now - latest_challenge.created_at).total_seconds()
        if elapsed < OTP_COOLDOWN_SECONDS:
            remaining = int(OTP_COOLDOWN_SECONDS - elapsed)
            raise ValidationError(f"Please wait {remaining} seconds before requesting a new OTP.")

    # 2. Check hourly rate limit
    one_hour_ago = now - timedelta(hours=1)
    challenges_in_last_hour = OTPChallenge.objects.filter(phone=phone, created_at__gte=one_hour_ago).count()
    if challenges_in_last_hour >= MAX_HOURLY_CHALLENGES:
        raise ValidationError("Too many OTP requests for this phone number. Please try again in an hour.")

    # 3. Generate 6-digit code
    # Allow fixed OTP '123456' for test phone numbers in dev/test mode
    is_dev_or_test = settings.DEBUG or os.environ.get("TESTING") == "true"
    if is_dev_or_test and phone in ("+919999999999", "+919876543210", "+919111111111", "+919222222222"):
        code = "123456"
    else:
        code = str(secrets.randbelow(900000) + 100000)

    # 4. Save challenge record
    expires_at = now + timedelta(minutes=OTP_EXPIRY_MINUTES)
    challenge = OTPChallenge.objects.create(
        phone=phone, code_hash=_hash_otp(code), purpose=purpose, expires_at=expires_at, ip=ip, device_id=device_id
    )

    # 5. Deliver OTP (Console logger during dev/pilot, SMS gateway in production)
    logger.info(f"[SMS CONSOLE PROVIDER] To: {phone} | Code: {code} | Expires: {expires_at.isoformat()}")
    print("\n==========================================")
    print(f" [FixPro SMS Gateway (Dev)] To: {phone}")
    print(f" OTP Code: {code} (Valid for {OTP_EXPIRY_MINUTES} mins)")
    print("==========================================\n")

    return challenge, OTP_COOLDOWN_SECONDS


def verify_otp_challenge(
    phone: str,
    code: str,
    purpose: str = OTPChallenge.PurposeChoices.LOGIN,
    device_id: str | None = None,
    platform: str = "web",
    app_version: str = "",
) -> tuple[User, str, str]:
    """
    Verify OTP code and authenticate user.
    Creates user and user device record if they don't exist yet.
    Returns (user, access_token, refresh_token).
    """
    phone = phone.strip()
    code = code.strip()
    now = timezone.now()

    # Find active unconsumed challenge
    challenge = (
        OTPChallenge.objects.filter(phone=phone, purpose=purpose, consumed_at__isnull=True)
        .order_by("-created_at")
        .first()
    )

    if not challenge:
        raise ValidationError("No active OTP challenge found for this phone number.")

    if challenge.is_expired:
        raise ValidationError("OTP has expired. Please request a new one.")

    if challenge.is_blocked:
        raise ValidationError("Too many incorrect attempts. Please request a new OTP.")

    # Validate code hash
    if challenge.code_hash != _hash_otp(code):
        challenge.attempts += 1
        challenge.save(update_fields=["attempts"])
        remaining = challenge.max_attempts - challenge.attempts
        if remaining <= 0:
            raise ValidationError("Incorrect OTP. Challenge locked. Request a new OTP.")
        raise ValidationError(f"Incorrect OTP. {remaining} attempt(s) remaining.")

    # Mark consumed
    challenge.consumed_at = now
    challenge.save(update_fields=["consumed_at"])

    # Get or create user
    user, created = User.objects.get_or_create(phone=phone, defaults={"is_active": True})

    user.last_login_at = now
    user.save(update_fields=["last_login_at"])

    # Register or update device
    resolved_device_id = device_id or f"web-{phone}-{user.id}"
    device, _ = UserDevice.objects.get_or_create(
        user=user,
        device_id=resolved_device_id,
        defaults={
            "platform": platform if platform in ("android", "ios", "web") else "web",
            "app_version": app_version,
            "last_seen_at": now,
        },
    )
    device.last_seen_at = now
    device.app_version = app_version or device.app_version
    device.save(update_fields=["last_seen_at", "app_version"])

    # Generate JWT tokens
    refresh = RefreshToken.for_user(user)
    refresh["phone"] = user.phone
    refresh["device_id"] = resolved_device_id

    access_token = str(refresh.access_token)
    refresh_token = str(refresh)

    return user, access_token, refresh_token
