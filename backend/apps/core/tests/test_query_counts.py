"""
Performance query count tests.
Verifies that listing endpoints do not suffer from N+1 query regressions
when rendering lists of 30 items.
"""

import uuid

import pytest
from django.utils import timezone

from apps.billing.models import Invoice, Payment
from apps.customers.models import Customer
from apps.devices.models import Device
from apps.jobs.models import Job, JobStatus
from apps.tenancy.models import ShopBrand

pytestmark = pytest.mark.django_db


@pytest.fixture
def seeded_shop_data(world):
    """Seed 30 items for customers, devices, jobs, invoices, and payments in shop A."""
    shop = world.shop_a
    owner = world.owner_a
    now = timezone.now()

    brand, _ = ShopBrand.objects.get_or_create(shop=shop, name="Apple", device_category="mobile")

    customers = [
        Customer(
            shop=shop,
            name=f"Customer {i}",
            phone=f"+9198000{i:05d}",
        )
        for i in range(1, 35)
    ]
    Customer.objects.bulk_create(customers)
    all_custs = list(Customer.objects.filter(shop=shop).order_by("created_at"))

    devices = [
        Device(
            shop=shop,
            customer=all_custs[i],
            brand=brand,
            model=f"Model {i}",
        )
        for i in range(len(all_custs))
    ]
    Device.objects.bulk_create(devices)
    all_devs = list(Device.objects.filter(shop=shop).order_by("created_at"))

    jobs = [
        Job(
            shop=shop,
            customer=all_custs[i],
            device=all_devs[i],
            job_no=1000 + i,
            status=JobStatus.RECEIVED,
            fault_description=f"Fault {i}",
            estimate_paise=100000,
            received_at=now,
            created_at=now,
        )
        for i in range(len(all_custs))
    ]
    Job.objects.bulk_create(jobs)
    all_jobs = list(Job.objects.filter(shop=shop).order_by("created_at"))

    invoices = [
        Invoice(
            shop=shop,
            customer=all_custs[i],
            job=all_jobs[i],
            kind=Invoice.Kind.SIMPLE_BILL,
            status=Invoice.Status.DRAFT,
            total_paise=100000,
            taxable_paise=100000,
        )
        for i in range(len(all_custs))
    ]
    Invoice.objects.bulk_create(invoices)

    payments = [
        Payment(
            shop=shop,
            customer=all_custs[i],
            job=all_jobs[i],
            direction=Payment.Direction.IN,
            mode="cash",
            amount_paise=50000,
            received_by=owner,
            received_at=now,
            idempotency_key=uuid.uuid4(),
        )
        for i in range(len(all_custs))
    ]
    Payment.objects.bulk_create(payments)

    return {
        "shop": shop,
        "owner": owner,
    }


def test_jobs_list_query_count(client_for, seeded_shop_data, django_assert_max_num_queries):
    client = client_for(seeded_shop_data["owner"], seeded_shop_data["shop"])
    # 30 items per page; with prefetching and subqueries, should easily be <= 10 queries
    with django_assert_max_num_queries(10):
        resp = client.get("/api/v1/jobs/?page_size=30")
        assert resp.status_code == 200
        assert len(resp.data["data"]) >= 30


def test_customers_list_query_count(client_for, seeded_shop_data, django_assert_max_num_queries):
    client = client_for(seeded_shop_data["owner"], seeded_shop_data["shop"])
    with django_assert_max_num_queries(8):
        resp = client.get("/api/v1/customers/?page_size=30")
        assert resp.status_code == 200
        assert len(resp.data["data"]) >= 30


def test_invoices_list_query_count(client_for, seeded_shop_data, django_assert_max_num_queries):
    client = client_for(seeded_shop_data["owner"], seeded_shop_data["shop"])
    with django_assert_max_num_queries(8):
        resp = client.get("/api/v1/invoices/?page_size=30")
        assert resp.status_code == 200
        assert len(resp.data["data"]) >= 30


def test_payments_list_query_count(client_for, seeded_shop_data, django_assert_max_num_queries):
    client = client_for(seeded_shop_data["owner"], seeded_shop_data["shop"])
    with django_assert_max_num_queries(8):
        resp = client.get("/api/v1/payments/?page_size=30")
        assert resp.status_code == 200
        assert len(resp.data["data"]) >= 30
