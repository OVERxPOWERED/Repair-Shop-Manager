"""
Tenancy lifecycle services.
Handles organization provisioning, default role seeding, and staff invitation.
"""

from django.db import transaction

from apps.tenancy.models import Membership, Organization, Role, Shop
from apps.tenancy.permissions import SYSTEM_ROLES


def seed_system_roles() -> dict[str, Role]:
    """
    Ensure the standard default system roles (Owner, Manager, Front Desk, Engineer)
    exist in the database with their canonical permissions.
    """
    roles = {}
    for role_name, perms in SYSTEM_ROLES.items():
        role, _ = Role.objects.get_or_create(
            organization=None, name=role_name, defaults={"is_system": True, "permissions": perms}
        )
        if role.permissions != perms or not role.is_system:
            role.permissions = perms
            role.is_system = True
            role.save(update_fields=["permissions", "is_system"])
        roles[role_name] = role
    return roles


def on_shop_created(shop: Shop) -> None:
    """Seeds per-shop defaults; extended in 1.1 and 1.5."""
    pass


@transaction.atomic
def create_organization_and_shop(
    owner_user,
    org_name: str,
    shop_name: str,
    shop_type: str = Shop.ShopTypeChoices.MOBILE,
    phone: str = "",
    **shop_kwargs,
) -> tuple[Organization, Shop, Membership]:
    """
    Onboards an owner with a new organization, their first shop, and an active Owner membership.
    """
    try:
        owner_role = Role.objects.get(organization=None, name="Owner")
    except Role.DoesNotExist:
        seed_system_roles()
        owner_role = Role.objects.get(organization=None, name="Owner")

    organization = Organization.objects.create(
        name=org_name.strip() or f"{owner_user.name or 'Owner'}'s Workshop", owner_user=owner_user
    )

    shop = Shop.objects.create(
        organization=organization,
        name=shop_name.strip() or organization.name,
        shop_type=shop_type,
        phone=phone or owner_user.phone,
        **shop_kwargs,
    )

    membership = Membership.objects.create(
        user=owner_user,
        shop=shop,
        role=owner_role,
        status=Membership.StatusChoices.ACTIVE,
        display_name=owner_user.name or "Owner",
    )

    on_shop_created(shop)

    return organization, shop, membership
