import secrets
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from apps.core.api.errors import ConflictError, DomainError, NotFoundError
from apps.tenancy.models import Membership, Role, Shop

JOIN_CODE_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"


def generate_unique_join_code() -> str:
    """Generates an unambiguous 7-char join code formatted as FX-XXXX."""
    for _ in range(50):
        suffix = "".join(secrets.choice(JOIN_CODE_CHARS) for _ in range(4))
        code = f"FX-{suffix}"
        if not Shop.objects.filter(join_code=code).exists():
            return code
    # Fallback to 6 random chars if collision rate is high
    suffix = "".join(secrets.choice(JOIN_CODE_CHARS) for _ in range(6))
    return f"FX-{suffix}"


def calculate_expiration(duration: str, custom_days: int | None = None):
    now = timezone.now()
    d = duration.lower()
    if d == "24h":
        return now + timedelta(hours=24)
    if d == "2d":
        return now + timedelta(days=2)
    if d == "5d":
        return now + timedelta(days=5)
    if d == "7d":
        return now + timedelta(days=7)
    if d == "never":
        return None
    if d == "custom":
        days = max(1, min(custom_days or 7, 365))
        return now + timedelta(days=days)
    return now + timedelta(days=7)


@transaction.atomic
def configure_join_code(
    shop: Shop,
    duration: str = "7d",
    custom_days: int | None = None,
    regenerate: bool = False,
    enabled: bool = True,
) -> Shop:
    if not shop.join_code or regenerate:
        shop.join_code = generate_unique_join_code()

    shop.join_code_expires_at = calculate_expiration(duration, custom_days)
    shop.join_code_enabled = enabled
    shop.save(update_fields=["join_code", "join_code_expires_at", "join_code_enabled", "updated_at"])
    return shop


@transaction.atomic
def request_join_with_code(user, code: str) -> Membership:
    clean_code = code.strip().upper()
    if not clean_code:
        raise DomainError("Please enter a valid join code.", code="join_code.invalid", status=400)

    shop = Shop.objects.filter(join_code__iexact=clean_code, deleted_at__isnull=True).first()
    if not shop:
        raise NotFoundError("Invalid shop join code.", code="join_code.invalid")

    if not shop.join_code_enabled:
        raise DomainError("This shop is not currently accepting join requests.", code="join_code.disabled", status=400)

    if shop.join_code_expires_at and timezone.now() >= shop.join_code_expires_at:
        raise DomainError(
            "This join code has expired. Ask your shop owner for a new code.",
            code="join_code.expired",
            status=400,
        )

    existing = Membership.objects.filter(user=user, shop=shop).first()
    if existing:
        if existing.status == Membership.StatusChoices.ACTIVE:
            raise ConflictError("You are already an active member of this shop.", code="join_code.already_member")
        if existing.status == Membership.StatusChoices.REQUESTED:
            return existing
        if existing.status == Membership.StatusChoices.SUSPENDED:
            raise DomainError("Your access to this shop has been suspended.", code="join_code.suspended", status=403)
        if existing.status == Membership.StatusChoices.REMOVED:
            existing.status = Membership.StatusChoices.REQUESTED
            existing.role = None
            existing.display_name = user.name or existing.display_name
            existing.save(update_fields=["status", "role", "display_name", "updated_at"])
            return existing

    return Membership.objects.create(
        user=user,
        shop=shop,
        role=None,
        status=Membership.StatusChoices.REQUESTED,
        display_name=user.name or "Staff Member",
    )


@transaction.atomic
def approve_join_request(*, actor: Membership, membership_id, role_id) -> Membership:
    membership = (
        Membership.objects.filter(
            id=membership_id,
            shop=actor.shop,
            status=Membership.StatusChoices.REQUESTED,
        )
        .select_related("user", "shop")
        .first()
    )
    if not membership:
        raise NotFoundError("Join request not found or already processed.", code="request.not_found")

    role = Role.objects.filter(id=role_id).first()
    if not role:
        raise NotFoundError("Role not found.", code="role.not_found")

    if role.name.strip().lower() == "owner":
        raise DomainError("Owner role cannot be assigned through staff approval.", code="role.cannot_assign_owner")

    if role.organization_id and role.organization_id != actor.shop.organization_id:
        raise DomainError("Role does not belong to this organization.", code="role.invalid")

    membership.role = role
    membership.status = Membership.StatusChoices.ACTIVE
    membership.save(update_fields=["role", "status", "updated_at"])
    return membership


@transaction.atomic
def reject_join_request(*, actor: Membership, membership_id) -> Membership:
    membership = Membership.objects.filter(
        id=membership_id,
        shop=actor.shop,
        status=Membership.StatusChoices.REQUESTED,
    ).first()
    if not membership:
        raise NotFoundError("Join request not found or already processed.", code="request.not_found")

    membership.status = Membership.StatusChoices.REMOVED
    membership.save(update_fields=["status", "updated_at"])
    return membership
