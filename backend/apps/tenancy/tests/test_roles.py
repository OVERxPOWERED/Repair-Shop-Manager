import pytest

from apps.tenancy.models import Role
from apps.tenancy.permissions import PERMISSION_CODES

pytestmark = pytest.mark.django_db


def test_system_roles_seeded(world):
    owner = Role.objects.get(organization=None, name="Owner")
    manager = Role.objects.get(organization=None, name="Manager")
    front_desk = Role.objects.get(organization=None, name="Front Desk")
    engineer = Role.objects.get(organization=None, name="Engineer")

    # Owner has every code in PERMISSION_CODES
    assert set(owner.permissions) == set(PERMISSION_CODES.keys())

    # Engineer lacks specific permissions
    assert "money.see_cost_profit" not in engineer.permissions
    assert "staff.manage" not in engineer.permissions
    assert "customers.see_phone" not in engineer.permissions

    # audit.view is Owner-only
    assert "audit.view" in owner.permissions
    assert "audit.view" not in manager.permissions
    assert "audit.view" not in front_desk.permissions
    assert "audit.view" not in engineer.permissions
