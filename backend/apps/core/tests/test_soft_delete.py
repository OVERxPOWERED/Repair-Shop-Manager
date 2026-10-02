import pytest

from apps.tenancy.models import Membership, Organization, Shop

pytestmark = pytest.mark.django_db


def test_instance_delete_is_soft(world):
    shop_id = world.shop_a.id
    world.shop_a.delete()
    assert not Shop.objects.filter(id=shop_id).exists()
    assert Shop.all_objects.filter(id=shop_id, deleted_at__isnull=False).exists()
    assert Membership.objects.filter(shop_id=shop_id).count() == 4  # nothing cascaded


def test_queryset_delete_is_soft(world):
    Organization.objects.filter(id=world.org_b.id).delete()
    assert Organization.all_objects.get(id=world.org_b.id).is_deleted


def test_restore(world):
    world.shop_a.delete()
    shop = Shop.all_objects.get(id=world.shop_a.id)
    shop.restore()
    assert Shop.objects.filter(id=shop.id).exists()


def test_hard_delete_really_deletes(db):
    from apps.tenancy.tests.factories import OrganizationFactory

    org = OrganizationFactory()
    org.hard_delete()
    assert not Organization.all_objects.filter(id=org.id).exists()
