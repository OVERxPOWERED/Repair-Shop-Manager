"""Shared pytest fixtures. `world` gives two shops with every default role in shop A."""

from dataclasses import dataclass

import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.tenancy.models import Membership, Organization, Role, Shop
from apps.tenancy.services import create_organization_and_shop, seed_system_roles


@pytest.fixture(autouse=True)
def _clear_cache():
    """Throttle counters live in the cache; never leak them between tests."""
    cache.clear()
    yield
    cache.clear()


@dataclass
class World:
    org_a: Organization
    shop_a: Shop
    owner_a: User
    manager_a: User
    front_desk_a: User
    engineer_a: User
    org_b: Organization
    shop_b: Shop
    owner_b: User

    def membership(self, user: User, shop: Shop) -> Membership:
        return Membership.objects.get(user=user, shop=shop)

    @property
    def membership_owner_a(self) -> Membership:
        return self.membership(self.owner_a, self.shop_a)

    @property
    def membership_manager_a(self) -> Membership:
        return self.membership(self.manager_a, self.shop_a)

    @property
    def membership_front_desk_a(self) -> Membership:
        return self.membership(self.front_desk_a, self.shop_a)

    @property
    def membership_engineer_a(self) -> Membership:
        return self.membership(self.engineer_a, self.shop_a)

    @property
    def membership_owner_b(self) -> Membership:
        return self.membership(self.owner_b, self.shop_b)

    @property
    def role_owner(self) -> Role:
        return Role.objects.get(organization=None, name="Owner")

    @property
    def role_manager(self) -> Role:
        return Role.objects.get(organization=None, name="Manager")

    @property
    def role_front_desk(self) -> Role:
        return Role.objects.get(organization=None, name="Front Desk")

    @property
    def role_engineer(self) -> Role:
        return Role.objects.get(organization=None, name="Engineer")


def _add_member(shop: Shop, phone: str, name: str, role_name: str) -> User:
    user = User.objects.create_user(phone=phone, name=name)
    role = Role.objects.get(organization=None, name=role_name)
    Membership.objects.create(
        user=user, shop=shop, role=role, status=Membership.StatusChoices.ACTIVE, display_name=name
    )
    return user


@pytest.fixture
def world(db) -> World:
    seed_system_roles()
    owner_a = User.objects.create_user(phone="+919000000001", name="Owner A")
    org_a, shop_a, _ = create_organization_and_shop(owner_user=owner_a, org_name="Apex", shop_name="Apex Main")
    owner_b = User.objects.create_user(phone="+919000000002", name="Owner B")
    org_b, shop_b, _ = create_organization_and_shop(owner_user=owner_b, org_name="Beacon", shop_name="Beacon Main")
    return World(
        org_a=org_a,
        shop_a=shop_a,
        owner_a=owner_a,
        manager_a=_add_member(shop_a, "+919000000011", "Manager A", "Manager"),
        front_desk_a=_add_member(shop_a, "+919000000012", "Front Desk A", "Front Desk"),
        engineer_a=_add_member(shop_a, "+919000000013", "Engineer A", "Engineer"),
        org_b=org_b,
        shop_b=shop_b,
        owner_b=owner_b,
    )


@pytest.fixture
def client_for():
    """client_for(user, shop) -> APIClient authenticated as user, sending X-Shop-Id for shop."""

    def make(user: User | None = None, shop: Shop | None = None) -> APIClient:
        client = APIClient()
        if user is not None:
            client.force_authenticate(user=user)
        if shop is not None:
            client.credentials(HTTP_X_SHOP_ID=str(shop.id))
        return client

    return make
