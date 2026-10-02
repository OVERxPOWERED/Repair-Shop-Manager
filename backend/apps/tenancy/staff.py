"""Rules for changing memberships. Views call these; never edit Membership.status/role directly."""

from django.db import transaction
from django.db.models import Q

from apps.core.api.errors import DomainError
from apps.tenancy.models import Membership, Role

PRIVILEGED_CODES = {"staff.manage", "roles.manage"}


def assignable_roles(shop):
    return Role.objects.filter(Q(organization__isnull=True) | Q(organization=shop.organization))


def _is_privileged(role: Role) -> bool:
    return bool(PRIVILEGED_CODES & set(role.permissions or []))


def _is_owner_role(role: Role) -> bool:
    return role.is_system and role.organization_id is None and role.name == "Owner"


def guard_target(actor: Membership, target: Membership) -> None:
    if target.user_id == actor.user_id:
        raise DomainError("You cannot change your own membership.", code="staff.cannot_modify_self", status=422)
    if target.user_id == target.shop.organization.owner_user_id:
        raise DomainError("The shop owner cannot be changed.", code="staff.cannot_modify_owner", status=422)
    if _is_privileged(target.role) and not actor.has_perm("roles.manage"):
        raise DomainError("Only the owner can change this member.", code="staff.insufficient_rank", status=403)


def validate_role_choice(actor: Membership, role: Role) -> None:
    if not assignable_roles(actor.shop).filter(pk=role.pk).exists():
        raise DomainError("Unknown role.", code="staff.role_invalid", status=400)
    if _is_owner_role(role):
        raise DomainError("The Owner role cannot be assigned.", code="staff.role_not_assignable", status=422)
    if _is_privileged(role) and not actor.has_perm("roles.manage"):
        raise DomainError("Only the owner can grant this role.", code="staff.insufficient_rank", status=403)


@transaction.atomic
def change_role(*, actor: Membership, target: Membership, role: Role) -> Membership:
    guard_target(actor, target)
    validate_role_choice(actor, role)
    target.role = role
    target.save(update_fields=["role", "updated_at"])
    return target


ALLOWED_STATUS_CHANGES = {
    Membership.StatusChoices.ACTIVE: {Membership.StatusChoices.SUSPENDED, Membership.StatusChoices.REMOVED},
    Membership.StatusChoices.SUSPENDED: {Membership.StatusChoices.ACTIVE, Membership.StatusChoices.REMOVED},
    Membership.StatusChoices.INVITED: {Membership.StatusChoices.REMOVED},
}


@transaction.atomic
def set_status(*, actor: Membership, target: Membership, status: str) -> Membership:
    guard_target(actor, target)
    if status not in ALLOWED_STATUS_CHANGES.get(target.status, set()):
        raise DomainError("This status change is not allowed.", code="staff.invalid_status_change", status=409)
    target.status = status
    target.save(update_fields=["status", "updated_at"])
    return target
