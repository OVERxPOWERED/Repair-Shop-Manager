"""OTP and session lifecycle."""

import hashlib
import hmac
import logging
import secrets
import uuid
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import OTPChallenge, User, UserDevice
from apps.core.api.errors import DomainError
from apps.core.sms import get_sms_provider

logger = logging.getLogger(__name__)

OTP_EXPIRY = timedelta(minutes=5)
OTP_COOLDOWN_SECONDS = 30
MAX_CHALLENGES_PER_HOUR = 6
LOGIN = OTPChallenge.PurposeChoices.LOGIN


def hash_otp(phone: str, code: str) -> str:
    """Keyed hash: without SECRET_KEY a leaked table cannot be brute-forced offline."""
    return hmac.new(settings.SECRET_KEY.encode(), f"otp:{phone}:{code}".encode(), hashlib.sha256).hexdigest()


def send_otp(*, phone: str, purpose: str = LOGIN, device_id: str | None = None, ip: str | None = None) -> OTPChallenge:
    now = timezone.now()
    fixed_code = settings.OTP_TEST_NUMBERS.get(phone)
    with transaction.atomic():
        latest = OTPChallenge.objects.select_for_update().filter(phone=phone).order_by("-created_at").first()
        if latest is not None:
            elapsed = (now - latest.created_at).total_seconds()
            if elapsed < OTP_COOLDOWN_SECONDS:
                wait = int(OTP_COOLDOWN_SECONDS - elapsed) + 1
                raise DomainError(
                    f"Please wait {wait} seconds before requesting a new OTP.",
                    code="otp.cooldown",
                    status=429,
                    wait=wait,
                )
        sent_last_hour = OTPChallenge.objects.filter(phone=phone, created_at__gte=now - timedelta(hours=1)).count()
        if sent_last_hour >= MAX_CHALLENGES_PER_HOUR:
            raise DomainError(
                "Too many OTP requests. Try again later.", code="otp.too_many_requests", status=429, wait=3600
            )
        code = fixed_code or f"{secrets.randbelow(1_000_000):06d}"
        challenge = OTPChallenge.objects.create(
            phone=phone,
            code_hash=hash_otp(phone, code),
            purpose=purpose,
            expires_at=now + OTP_EXPIRY,
            ip=ip,
            device_id=device_id,
        )
    if fixed_code is None:
        get_sms_provider().send_otp(phone=phone, code=code)
    return challenge


def _check_code(*, phone: str, code: str, purpose: str) -> None:
    """Raises DomainError unless the code matches the newest open challenge. Counts failed attempts."""
    with transaction.atomic():
        challenge = (
            OTPChallenge.objects.select_for_update()
            .filter(phone=phone, purpose=purpose, consumed_at__isnull=True)
            .order_by("-created_at")
            .first()
        )
        if challenge is None:
            raise DomainError("Request a new OTP.", code="otp.not_found", status=400)
        if challenge.is_expired:
            raise DomainError("This OTP has expired. Request a new one.", code="otp.expired", status=400)
        if challenge.is_blocked:
            raise DomainError("Too many wrong attempts. Request a new OTP.", code="otp.locked", status=400)
        matched = hmac.compare_digest(challenge.code_hash, hash_otp(phone, code))
        if matched:
            challenge.consumed_at = timezone.now()
            challenge.save(update_fields=["consumed_at"])
        else:
            challenge.attempts += 1
            challenge.save(update_fields=["attempts"])
    # Raise only after the transaction commits, so the failed attempt is stored.
    if not matched:
        remaining = max(challenge.max_attempts - challenge.attempts, 0)
        if remaining == 0:
            raise DomainError("Too many wrong attempts. Request a new OTP.", code="otp.locked", status=400)
        raise DomainError(
            "Incorrect OTP.", code="otp.invalid", status=400, fields={"code": [f"{remaining} attempt(s) left"]}
        )


def issue_tokens(user: User, device: UserDevice) -> dict:
    refresh = RefreshToken.for_user(user)
    refresh["did"] = device.device_id
    refresh["fam"] = str(device.refresh_family)
    return {"access": str(refresh.access_token), "refresh": str(refresh), "token_type": "Bearer"}


def verify_otp_and_login(
    *, phone: str, code: str, device_id: str, platform: str, app_version: str = "", purpose: str = LOGIN
) -> tuple[User, UserDevice, dict, bool]:
    """Returns (user, device, tokens, is_new_device)."""
    _check_code(phone=phone, code=code, purpose=purpose)
    now = timezone.now()
    with transaction.atomic():
        user = User.objects.select_for_update().filter(phone=phone).first()
        if user is None:
            user = User.objects.create_user(phone=phone)
        elif user.deleted_at is not None or not user.is_active:
            raise DomainError("This account is disabled.", code="auth.account_disabled", status=403)
        user.last_login_at = now
        user.save(update_fields=["last_login_at"])

        device, created = UserDevice.objects.select_for_update().get_or_create(
            user=user, device_id=device_id, defaults={"platform": platform}
        )
        device.platform = platform
        device.app_version = app_version or device.app_version
        device.last_seen_at = now
        device.revoked_at = None
        device.refresh_family = uuid.uuid4()  # new login = new token family
        device.save()
    return user, device, issue_tokens(user, device), created


def revoke_device(device: UserDevice) -> None:
    device.revoked_at = timezone.now()
    device.refresh_family = uuid.uuid4()
    device.save(update_fields=["revoked_at", "refresh_family"])


def logout_everywhere(user: User) -> None:
    for device in UserDevice.objects.filter(user=user, revoked_at__isnull=True):
        revoke_device(device)
    for token in OutstandingToken.objects.filter(user=user, blacklistedtoken__isnull=True):
        BlacklistedToken.objects.get_or_create(token=token)


def purge_old_otp_challenges(days: int = 7) -> int:
    deleted, _ = OTPChallenge.objects.filter(created_at__lt=timezone.now() - timedelta(days=days)).delete()
    return deleted
