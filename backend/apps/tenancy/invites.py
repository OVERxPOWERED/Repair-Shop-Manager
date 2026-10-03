import hashlib
import secrets
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from apps.core.api.errors import ConflictError, DomainError, NotFoundError
from apps.core.sms import get_sms_provider
from apps.tenancy import staff as staff_service
from apps.tenancy.models import Invite, Membership

INVITE_TTL = timedelta(days=7)


def pending_invites_for_phone(phone: str):
    return Invite.objects.filter(
        phone=phone,
        accepted_at__isnull=True,
        revoked_at__isnull=True,
        expires_at__gt=timezone.now(),
        shop__deleted_at__isnull=True,
    ).select_related("shop", "role", "invited_by")


@transaction.atomic
def create_invite(*, actor: Membership, phone: str, role) -> Invite:
    staff_service.validate_role_choice(actor, role)
    if Membership.objects.filter(shop=actor.shop, user__phone=phone).exclude(status="removed").exists():
        raise ConflictError("This person is already on your staff.", code="invite.already_member")
    Invite.objects.filter(shop=actor.shop, phone=phone, accepted_at__isnull=True, revoked_at__isnull=True).update(
        revoked_at=timezone.now()
    )
    token = secrets.token_urlsafe(32)
    invite = Invite.objects.create(
        shop=actor.shop,
        phone=phone,
        role=role,
        invited_by=actor.user,
        token_hash=hashlib.sha256(token.encode()).hexdigest(),
        expires_at=timezone.now() + INVITE_TTL,
    )
    transaction.on_commit(
        lambda: get_sms_provider().send_text(
            phone=phone,
            body=f"You are invited to join {actor.shop.name} on FixPro. Log in with this number to accept.",
        )
    )
    return invite


@transaction.atomic
def accept_invite(*, user, invite_id) -> Membership:
    # select_related(None): Postgres refuses FOR UPDATE across the nullable invited_by outer join.
    invite = pending_invites_for_phone(user.phone).select_related(None).select_for_update().filter(pk=invite_id).first()
    if invite is None:
        raise NotFoundError("Invite not found or expired.", code="invite.not_found")
    membership = Membership.objects.filter(user=user, shop=invite.shop).exclude(status="removed").first()
    if membership is None:
        membership = Membership.objects.create(
            user=user,
            shop=invite.shop,
            role=invite.role,
            status=Membership.StatusChoices.ACTIVE,
            display_name=user.name,
        )
    elif membership.status != Membership.StatusChoices.ACTIVE:
        raise DomainError("Your access to this shop is suspended.", code="invite.membership_suspended", status=409)
    invite.accepted_at = timezone.now()
    invite.save(update_fields=["accepted_at", "updated_at"])
    return membership


@transaction.atomic
def decline_invite(*, user, invite_id) -> None:
    updated = pending_invites_for_phone(user.phone).filter(pk=invite_id).update(revoked_at=timezone.now())
    if not updated:
        raise NotFoundError("Invite not found or expired.", code="invite.not_found")
