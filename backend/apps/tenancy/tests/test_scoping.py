import uuid

import pytest
from django.urls import URLPattern, URLResolver, get_resolver

from apps.accounts.tests.factories import UserFactory
from apps.tenancy.models import Membership, Organization, Role
from apps.tenancy.viewsets import ShopScopedMixin

pytestmark = pytest.mark.django_db


def test_missing_or_bad_header(client_for, world):
    c = client_for(world.owner_a)
    # No header
    r = c.get("/api/v1/staff/")
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "shop.header_missing"

    # Bad UUID
    r = c.get("/api/v1/staff/", HTTP_X_SHOP_ID="invalid-uuid")
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "shop.header_invalid"


def test_nonexistent_or_other_shop_returns_404(client_for, world):
    c = client_for(world.owner_a)
    # Random UUID
    r1 = c.get("/api/v1/staff/", HTTP_X_SHOP_ID=str(uuid.uuid4()))
    assert r1.status_code == 404
    assert r1.json()["error"]["code"] == "shop.not_found"

    # Owner A calling with Shop B
    r2 = c.get("/api/v1/staff/", HTTP_X_SHOP_ID=str(world.shop_b.id))
    assert r2.status_code == 404
    assert r2.json()["error"]["code"] == "shop.not_found"
    assert r1.json()["error"]["code"] == r2.json()["error"]["code"]
    assert r1.json()["error"]["message"] == r2.json()["error"]["message"]


def test_suspended_member_or_org_returns_404(client_for, world):
    c = client_for(world.engineer_a, world.shop_a)
    m = world.membership_engineer_a
    m.status = Membership.StatusChoices.SUSPENDED
    m.save()

    r = c.get("/api/v1/staff/")
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "shop.not_found"

    # Reactivate membership, but suspend organization
    m.status = Membership.StatusChoices.ACTIVE
    m.save()

    org = world.org_a
    org.status = Organization.StatusChoices.SUSPENDED
    org.save()

    r2 = c.get("/api/v1/staff/")
    assert r2.status_code == 404
    assert r2.json()["error"]["code"] == "shop.not_found"


def test_custom_role_with_no_permissions_denied(client_for, world):
    role = Role.objects.create(organization=world.org_a, name="Trainee", permissions=[])
    user = UserFactory()
    Membership.objects.create(user=user, shop=world.shop_a, role=role, status=Membership.StatusChoices.ACTIVE)
    c = client_for(user, world.shop_a)
    r = c.get("/api/v1/staff/")
    assert r.status_code == 403
    assert r.json()["error"]["code"] == "permission.denied"


def test_custom_role_named_owner_with_no_permissions_denied(client_for, world):
    role = Role.objects.create(organization=world.org_a, name="Owner", permissions=[])
    user = UserFactory()
    Membership.objects.create(user=user, shop=world.shop_a, role=role, status=Membership.StatusChoices.ACTIVE)
    c = client_for(user, world.shop_a)
    r = c.get("/api/v1/staff/")
    assert r.status_code == 403
    assert r.json()["error"]["code"] == "permission.denied"


def test_platform_admin_not_a_member_returns_404(client_for, world):
    admin_user = UserFactory(is_platform_admin=True)
    c = client_for(admin_user, world.shop_a)
    r = c.get("/api/v1/staff/")
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "shop.not_found"


def _walk(patterns):
    for p in patterns:
        if isinstance(p, URLResolver):
            yield from _walk(p.url_patterns)
        elif isinstance(p, URLPattern):
            yield p


def test_every_scoped_action_has_a_permission():
    missing = []
    for pattern in _walk(get_resolver().url_patterns):
        view_class = getattr(pattern.callback, "cls", None) or getattr(pattern.callback, "view_class", None)
        if not (view_class and issubclass(view_class, ShopScopedMixin)):
            continue
        actions = getattr(pattern.callback, "actions", None) or {
            m: m for m in ("get", "post", "patch", "delete") if hasattr(view_class, m)
        }
        for method, action_name in actions.items():
            if method in ("head", "options"):
                continue
            if action_name not in view_class.permission_map:
                missing.append(f"{view_class.__name__}.{action_name}")
    assert not missing, missing
