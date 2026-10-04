"""
Tests for customer data anonymization endpoint and privacy compliance.
"""

import pytest
from rest_framework import status

from apps.billing.models import Invoice
from apps.customers.models import Customer
from apps.devices.models import Device
from apps.jobs.models import Job, JobStatus
from apps.tenancy.models import ShopBrand

pytestmark = pytest.mark.django_db


def test_customer_anonymize_endpoint(world, client_for):
    """Customer PII is anonymized while preserving relationship to existing jobs and invoices."""
    shop = world.shop_a
    client = client_for(world.owner_a, shop)

    customer = Customer.objects.create(
        shop=shop,
        name="Sensitive Customer",
        phone="+919876543999",
        alt_phone="+919876543888",
        email="customer@example.com",
        address="123 Secret Lane",
        notes="High-profile customer VIP",
    )
    brand, _ = ShopBrand.objects.get_or_create(shop=shop, name="Samsung", device_category="mobile")
    device = Device.objects.create(shop=shop, customer=customer, brand=brand, model="Galaxy S22")
    job = Job.objects.create(
        shop=shop,
        customer=customer,
        device=device,
        job_no=5001,
        status=JobStatus.RECEIVED,
        fault_description="Broken screen",
        received_at=customer.created_at,
    )
    invoice = Invoice.objects.create(
        shop=shop,
        customer=customer,
        job=job,
        kind=Invoice.Kind.SIMPLE_BILL,
        status=Invoice.Status.DRAFT,
        total_paise=50000,
        taxable_paise=50000,
    )

    resp = client.post(f"/api/v1/customers/{customer.id}/anonymize/")
    assert resp.status_code == status.HTTP_200_OK

    customer.refresh_from_db()
    assert customer.name == "Anonymized Customer"
    assert customer.phone is None
    assert customer.alt_phone == ""
    assert customer.email == ""
    assert customer.address == ""
    assert customer.notes == ""
    assert not customer.whatsapp_opt_in
    assert not customer.sms_opt_in
    assert customer.deleted_at is not None

    # Job and invoice still reference the customer without integrity breakdown
    job.refresh_from_db()
    assert job.customer_id == customer.id
    invoice.refresh_from_db()
    assert invoice.customer_id == customer.id


def test_customer_anonymize_permission_denied(world, client_for):
    """User without customers.delete permission cannot anonymize customer."""
    shop = world.shop_a
    engineer_client = client_for(world.engineer_a, shop)

    customer = Customer.objects.create(shop=shop, name="Any Customer", phone="+919876543111")
    resp = engineer_client.post(f"/api/v1/customers/{customer.id}/anonymize/")
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_customer_anonymize_cross_shop_isolated(world, client_for):
    """User from Shop B cannot anonymize a customer belonging to Shop A."""
    customer_a = Customer.objects.create(shop=world.shop_a, name="Shop A Cust", phone="+919876543222")
    client_b = client_for(world.owner_b, world.shop_b)

    resp = client_b.post(f"/api/v1/customers/{customer_a.id}/anonymize/")
    assert resp.status_code in (status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN)
