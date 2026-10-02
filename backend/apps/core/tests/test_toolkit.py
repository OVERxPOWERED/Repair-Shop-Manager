import pytest

from apps.tenancy.models import Membership

pytestmark = pytest.mark.django_db


def test_world_has_all_roles(world):
    roles = set(Membership.objects.filter(shop=world.shop_a).values_list("role__name", flat=True))
    assert roles == {"Owner", "Manager", "Front Desk", "Engineer"}
    assert Membership.objects.filter(shop=world.shop_b).count() == 1


def test_client_for_sends_shop_header(world, client_for):
    client = client_for(world.owner_a, world.shop_a)
    assert client._credentials["HTTP_X_SHOP_ID"] == str(world.shop_a.id)
