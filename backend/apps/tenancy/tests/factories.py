import factory
from factory.django import DjangoModelFactory

from apps.accounts.tests.factories import UserFactory
from apps.tenancy.models import Membership, Organization, Role, Shop


class OrganizationFactory(DjangoModelFactory):
    class Meta:
        model = Organization

    name = factory.Sequence(lambda n: f"Org {n}")
    owner_user = factory.SubFactory(UserFactory)


class ShopFactory(DjangoModelFactory):
    class Meta:
        model = Shop

    organization = factory.SubFactory(OrganizationFactory)
    name = factory.Sequence(lambda n: f"Shop {n}")
    phone = "+919800000000"


class MembershipFactory(DjangoModelFactory):
    class Meta:
        model = Membership

    user = factory.SubFactory(UserFactory)
    shop = factory.SubFactory(ShopFactory)
    role = factory.LazyFunction(lambda: Role.objects.get(organization=None, name="Engineer"))
    status = Membership.StatusChoices.ACTIVE
