import factory
from factory.django import DjangoModelFactory

from apps.accounts.tests.factories import UserFactory
from apps.core.choices import DeviceCategory
from apps.customers.tests.factories import CustomerFactory
from apps.devices.models import Device, DeviceIdentifier
from apps.tenancy.tests.factories import ShopFactory


class DeviceFactory(DjangoModelFactory):
    class Meta:
        model = Device

    shop = factory.SubFactory(ShopFactory)
    created_by = factory.SubFactory(UserFactory)
    customer = factory.SubFactory(CustomerFactory)
    category = DeviceCategory.MOBILE
    model = factory.Sequence(lambda n: f"Galaxy S{n}")


class DeviceIdentifierFactory(DjangoModelFactory):
    class Meta:
        model = DeviceIdentifier

    shop = factory.SubFactory(ShopFactory)
    created_by = factory.SubFactory(UserFactory)
    device = factory.SubFactory(DeviceFactory)
    type = DeviceIdentifier.Type.IMEI1
    value = "490154203237518"
    luhn_valid = True
