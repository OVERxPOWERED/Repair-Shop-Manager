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

from apps.accounts.models import AccountDeletionRequest, OTPChallenge, User, UserDevice
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


def verify_google_token(token: str) -> dict:
    """Verifies a Google ID token with Google's public certificates."""
    if not token or not isinstance(token, str):
        raise DomainError("Missing or invalid Google token.", code="auth.invalid_google_token", status=400)

    # Allow mock tokens strictly in debug or automated test environments: "test-google-token:<sub>:<email>:<name>"
    is_test_env = bool(settings.DEBUG or getattr(settings, "IS_TESTING", False))
    if is_test_env and token.startswith("test-google-token:"):
        parts = token.split(":")
        sub = parts[1] if len(parts) > 1 else "123456789"
        email = parts[2] if len(parts) > 2 else "test@example.com"
        name = parts[3] if len(parts) > 3 else "Test User"
        return {"sub": sub, "email": email, "name": name, "email_verified": True}

    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token

    client_ids = getattr(settings, "GOOGLE_CLIENT_IDS", [])
    if not client_ids:
        logger.error("GOOGLE_CLIENT_IDS is not configured in settings.")
        raise DomainError(
            "Google sign-in is not configured on this server.", code="auth.google_not_configured", status=503
        )

    audience = client_ids[0] if len(client_ids) == 1 else client_ids

    try:
        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), audience=audience)
        return idinfo
    except Exception as exc:
        logger.warning("Google token verification failed: %s", exc)
        raise DomainError("Invalid Google authentication token.", code="auth.invalid_google_token", status=400) from exc


def login_or_register_with_google(
    *, id_token: str, device_id: str, platform: str, app_version: str = ""
) -> tuple[User, UserDevice, dict, bool]:
    """Returns (user, device, tokens, is_new_device)."""
    claims = verify_google_token(id_token)
    sub = claims.get("sub")
    email = claims.get("email")
    name = claims.get("name", "")
    email_verified = claims.get("email_verified") is True

    if not sub:
        raise DomainError("Invalid Google identity payload.", code="auth.invalid_google_token", status=400)

    now = timezone.now()
    with transaction.atomic():
        user = User.objects.select_for_update().filter(google_sub=sub).first()
        if user is None and email and email_verified:
            user = User.objects.select_for_update().filter(email=email).first()
            if user and not user.google_sub:
                user.google_sub = sub
                user.save(update_fields=["google_sub"])

        if user is None:
            user = User.objects.create_user(phone=None, email=email, google_sub=sub, name=name)
        elif user.deleted_at is not None or not user.is_active:
            raise DomainError("This account is disabled.", code="auth.account_disabled", status=403)
        else:
            fields_to_update = []
            if not user.name and name:
                user.name = name
                fields_to_update.append("name")
            if not user.google_sub:
                user.google_sub = sub
                fields_to_update.append("google_sub")
            if fields_to_update:
                user.save(update_fields=fields_to_update)

        user.last_login_at = now
        user.save(update_fields=["last_login_at"])

        device, created = UserDevice.objects.select_for_update().get_or_create(
            user=user, device_id=device_id, defaults={"platform": platform}
        )
        device.platform = platform
        device.app_version = app_version or device.app_version
        device.last_seen_at = now
        device.revoked_at = None
        device.refresh_family = uuid.uuid4()
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


DELETION_GRACE_PERIOD_DAYS = 7


def request_account_deletion(
    *, user: User, reason: str = "", grace_days: int = DELETION_GRACE_PERIOD_DAYS
) -> AccountDeletionRequest:
    """
    Submits an account deletion request with a grace period.
    Rejects request if user is the sole owner of an active shop with other active staff members.
    """
    from apps.tenancy.models import Membership, Role

    owner_role = Role.objects.filter(organization=None, name="Owner").first()
    if owner_role:
        user_owner_memberships = Membership.objects.filter(
            user=user,
            role=owner_role,
            status=Membership.StatusChoices.ACTIVE,
        )
        for m in user_owner_memberships:
            other_active_owners = (
                Membership.objects.filter(
                    shop=m.shop,
                    role=owner_role,
                    status=Membership.StatusChoices.ACTIVE,
                )
                .exclude(user=user)
                .exists()
            )
            if not other_active_owners:
                other_staff = (
                    Membership.objects.filter(
                        shop=m.shop,
                        status=Membership.StatusChoices.ACTIVE,
                    )
                    .exclude(user=user)
                    .exists()
                )
                if other_staff:
                    raise DomainError(
                        f"Cannot delete account: You are the sole owner of '{m.shop.name}' with active staff members. "
                        "Please transfer shop ownership first.",
                        code="accounts.sole_owner_conflict",
                        status=409,
                    )

    now = timezone.now()
    scheduled_for = now + timedelta(days=grace_days)

    with transaction.atomic():
        existing = AccountDeletionRequest.objects.filter(
            user=user, status=AccountDeletionRequest.StatusChoices.PENDING
        ).first()
        if existing:
            return existing

        req = AccountDeletionRequest.objects.create(
            user=user,
            requested_at=now,
            scheduled_for=scheduled_for,
            status=AccountDeletionRequest.StatusChoices.PENDING,
            reason=reason,
        )
    return req


def cancel_account_deletion(*, user: User) -> AccountDeletionRequest:
    """Cancels a pending account deletion request during grace period."""
    with transaction.atomic():
        req = (
            AccountDeletionRequest.objects.select_for_update()
            .filter(user=user, status=AccountDeletionRequest.StatusChoices.PENDING)
            .first()
        )
        if not req:
            raise DomainError(
                "No pending account deletion request found.",
                code="accounts.no_pending_deletion",
                status=404,
            )
        req.status = AccountDeletionRequest.StatusChoices.CANCELLED
        req.save(update_fields=["status"])
    return req


def execute_account_deletion(*, request_obj: AccountDeletionRequest) -> None:
    """
    Executes actual deletion/anonymization of the user.
    - Anonymizes phone and name
    - Revokes all sessions, devices, and auth tokens
    - Sets user.is_active = False, user.deleted_at = now
    - Marks deletion request completed
    """
    now = timezone.now()
    user = request_obj.user
    with transaction.atomic():
        logout_everywhere(user)
        anon_phone = f"+00{uuid.uuid4().hex[:12]}"
        user.phone = anon_phone
        user.name = "Deleted User"
        user.is_active = False
        user.deleted_at = now
        user.save(update_fields=["phone", "name", "is_active", "deleted_at"])

        from apps.tenancy.models import Membership

        Membership.objects.filter(user=user).update(status=Membership.StatusChoices.REMOVED)

        request_obj.status = AccountDeletionRequest.StatusChoices.COMPLETED
        request_obj.completed_at = now
        request_obj.save(update_fields=["status", "completed_at"])


def process_due_account_deletions() -> int:
    """Processes all pending account deletion requests whose scheduled_for time has passed."""
    now = timezone.now()
    due_requests = AccountDeletionRequest.objects.filter(
        status=AccountDeletionRequest.StatusChoices.PENDING,
        scheduled_for__lte=now,
    ).select_related("user")

    processed = 0
    for req in due_requests:
        try:
            execute_account_deletion(request_obj=req)
            processed += 1
        except Exception as e:
            logger.exception("Failed to execute account deletion %s: %s", req.id, e)
    return processed
