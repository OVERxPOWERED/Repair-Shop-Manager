import factory
from factory.django import DjangoModelFactory

from apps.accounts.tests.factories import UserFactory
from apps.customers.models import Customer
from apps.tenancy.tests.factories import ShopFactory


class CustomerFactory(DjangoModelFactory):
    class Meta:
        model = Customer

    shop = factory.SubFactory(ShopFactory)
    created_by = factory.SubFactory(UserFactory)
    name = factory.Sequence(lambda n: f"Customer {n}")
    phone = factory.Sequence(lambda n: f"+9198111{n:05d}")
