"""
Exhaustive permission matrix tests and multi-tenant isolation sweep.
Covers every shop-scoped endpoint against all system roles:
Owner, Manager, Front Desk, and Engineer.
"""

import uuid

import pytest
from django.utils import timezone
from rest_framework import status

from apps.accounts.models import User
from apps.billing.models import Invoice, Payment
from apps.customers.models import Customer
from apps.devices.models import Device
from apps.jobs.models import Job, JobStatus
from apps.tenancy.models import Membership, Role, ShopBrand

pytestmark = pytest.mark.django_db


@pytest.fixture
def shop_entities(world):
    """Seed sample entities in Shop A for matrix testing."""
    shop_a = world.shop_a
    owner_a = world.owner_a

    customer = Customer.objects.create(
        shop=shop_a,
        name="Matrix Customer",
        phone="+919800000001",
    )
    brand, _ = ShopBrand.objects.get_or_create(shop=shop_a, name="Apple", device_category="mobile")
    device = Device.objects.create(
        shop=shop_a,
        customer=customer,
        brand=brand,
        model="iPhone 14",
    )
    now = timezone.now()
    extra_user = User.objects.create_user(phone="+919999900099", password="pw")
    extra_member = Membership.objects.create(
        shop=shop_a,
        user=extra_user,
        role=Role.objects.get(organization=None, name="Engineer"),
        status=Membership.StatusChoices.ACTIVE,
    )
    job = Job.objects.create(
        shop=shop_a,
        customer=customer,
        device=device,
        job_no=1001,
        status=JobStatus.RECEIVED,
        fault_description="Battery replacement",
        estimate_paise=150000,
        received_at=now,
        created_at=now,
        assigned_to=world.membership_engineer_a,
    )
    payment = Payment.objects.create(
        shop=shop_a,
        customer=customer,
        job=job,
        direction=Payment.Direction.IN,
        mode="cash",
        amount_paise=50000,
        received_by=owner_a,
        received_at=now,
        idempotency_key=uuid.uuid4(),
    )
    invoice = Invoice.objects.create(
        shop=shop_a,
        customer=customer,
        job=job,
        kind=Invoice.Kind.TAX_INVOICE,
        status=Invoice.Status.DRAFT,
        total_paise=150000,
        taxable_paise=150000,
    )

    return {
        "customer": customer,
        "device": device,
        "job": job,
        "payment": payment,
        "invoice": invoice,
        "staff": extra_member,
    }


ENDPOINT_MATRIX = [
    # Jobs
    ("GET", "/api/v1/jobs/", "jobs.view", None),
    (
        "POST",
        "/api/v1/jobs/",
        "jobs.create",
        lambda e: {
            "customer_id": str(e["customer"].id),
            "device_id": str(e["device"].id),
            "fault_description": "Testing matrix",
        },
    ),
    ("GET", "/api/v1/jobs/{job_id}/", "jobs.view", None),
    ("PATCH", "/api/v1/jobs/{job_id}/", "jobs.edit", lambda e: {"fault_description": "Updated fault"}),
    ("DELETE", "/api/v1/jobs/{job_id}/", "jobs.delete", None),
    ("POST", "/api/v1/jobs/{job_id}/assign/", "jobs.assign", lambda e: {"assigned_to_id": str(e["staff"].id)}),
    ("POST", "/api/v1/jobs/{job_id}/lock/", "jobs.view_device_lock", lambda e: {}),
    ("POST", "/api/v1/jobs/{job_id}/status/", "jobs.change_status", lambda e: {"to_status": "diagnosing"}),
    ("GET", "/api/v1/jobs/{job_id}/history/", "jobs.view", None),
    ("GET", "/api/v1/jobs/{job_id}/notes/", "jobs.view", None),
    ("POST", "/api/v1/jobs/{job_id}/notes/", "jobs.edit", lambda e: {"content": "Matrix note"}),
    ("GET", "/api/v1/jobs/{job_id}/photos/", "jobs.view", None),
    ("GET", "/api/v1/jobs/{job_id}/line-items/", "jobs.view", None),
    (
        "POST",
        "/api/v1/jobs/{job_id}/line-items/",
        "jobs.edit",
        lambda e: {"kind": "labour", "description": "Diagnostic fee", "unit_price_paise": 20000},
    ),
    ("POST", "/api/v1/jobs/{job_id}/invoice/", "invoices.create_draft", lambda e: {}),
    ("GET", "/api/v1/jobs/{job_id}/payments/", "payments.view", None),
    (
        "POST",
        "/api/v1/jobs/{job_id}/payments/",
        "payments.record",
        lambda e: {"mode": "cash", "amount_paise": 10000},
    ),
    # Customers
    ("GET", "/api/v1/customers/", "customers.view", None),
    ("POST", "/api/v1/customers/", "customers.create", lambda e: {"name": "New Cust", "phone": "+919800009999"}),
    ("GET", "/api/v1/customers/{customer_id}/", "customers.view", None),
    ("PATCH", "/api/v1/customers/{customer_id}/", "customers.edit", lambda e: {"name": "Edited Cust"}),
    ("DELETE", "/api/v1/customers/{customer_id}/", "customers.delete", None),
    # Devices
    ("GET", "/api/v1/devices/", "customers.view", None),
    ("GET", "/api/v1/devices/{device_id}/", "jobs.view", None),
    # Invoices & Billing
    ("GET", "/api/v1/invoices/", "invoices.view", None),
    ("GET", "/api/v1/invoices/{invoice_id}/", "invoices.view", None),
    ("POST", "/api/v1/invoices/{invoice_id}/issue/", "invoices.issue", lambda e: {}),
    ("POST", "/api/v1/invoices/{invoice_id}/cancel/", "invoices.cancel", lambda e: {"reason": "Cancelled"}),
    # Payments
    ("GET", "/api/v1/payments/", "payments.view", None),
    ("GET", "/api/v1/payments/{payment_id}/", "payments.view", None),
    (
        "POST",
        "/api/v1/payments/{payment_id}/refund/",
        "payments.refund",
        lambda e: {"amount_paise": 10000, "reason": "Refund"},
    ),
    # Staff & Roles
    ("GET", "/api/v1/roles/", "staff.view", None),
    ("GET", "/api/v1/staff/", "staff.view", None),
    ("GET", "/api/v1/staff/{staff_id}/", "staff.view", None),
    ("POST", "/api/v1/staff/{staff_id}/suspend/", "staff.manage", lambda e: {}),
    # Shop Settings
    ("GET", "/api/v1/brands/", "jobs.view", None),
    ("POST", "/api/v1/brands/", "shop.settings", lambda e: {"name": "MatrixBrand", "device_category": "mobile"}),
    ("GET", "/api/v1/accessory-options/", "jobs.view", None),
    ("POST", "/api/v1/accessory-options/", "shop.settings", lambda e: {"name": "MatrixAccessory"}),
    ("GET", "/api/v1/message-templates/", "shop.settings", None),
    # Audit & Reports
    ("GET", "/api/v1/audit-logs/", "audit.view", None),
    ("GET", "/api/v1/reports/summary/", "reports.view_basic", None),
    # Exports
    ("GET", "/api/v1/exports/jobs.xlsx", "data.export", None),
    ("GET", "/api/v1/exports/customers.xlsx", "data.export", None),
]


def resolve_url(template: str, entities: dict) -> str:
    return (
        template.replace("{job_id}", str(entities["job"].id))
        .replace("{customer_id}", str(entities["customer"].id))
        .replace("{device_id}", str(entities["device"].id))
        .replace("{invoice_id}", str(entities["invoice"].id))
        .replace("{payment_id}", str(entities["payment"].id))
        .replace("{staff_id}", str(entities["staff"].id))
    )


@pytest.mark.parametrize("method,url_template,perm_code,payload_fn", ENDPOINT_MATRIX)
def test_permission_matrix_all_roles(world, client_for, shop_entities, method, url_template, perm_code, payload_fn):
    url = resolve_url(url_template, shop_entities)
    payload = payload_fn(shop_entities) if payload_fn else {}

    roles = [
        ("Owner", world.owner_a),
        ("Manager", world.manager_a),
        ("Front Desk", world.front_desk_a),
        ("Engineer", world.engineer_a),
    ]

    for role_name, user in roles:
        # Reset target staff status to ACTIVE in case a prior role modified it
        target_staff = shop_entities["staff"]
        target_staff.refresh_from_db()
        if target_staff.status != Membership.StatusChoices.ACTIVE:
            target_staff.status = Membership.StatusChoices.ACTIVE
            target_staff.save(update_fields=["status"])

        membership = Membership.objects.get(shop=world.shop_a, user=user)
        has_perm = membership.has_perm(perm_code)

        client = client_for(user, world.shop_a)
        if method == "GET":
            resp = client.get(url)
        elif method == "POST":
            resp = client.post(url, payload, format="json")
        elif method == "PATCH":
            resp = client.patch(url, payload, format="json")
        elif method == "DELETE":
            resp = client.delete(url)
        else:
            raise ValueError(f"Unsupported method {method}")

        if not has_perm:
            resp_info = resp.data if hasattr(resp, "data") else ""
            assert resp.status_code == status.HTTP_403_FORBIDDEN, (
                f"Role '{role_name}' lacks permission '{perm_code}', "
                f"expected 403 on {method} {url}, got {resp.status_code} ({resp_info})"
            )
        else:
            assert resp.status_code != status.HTTP_403_FORBIDDEN, (
                f"Role '{role_name}' has permission '{perm_code}', but got 403 on {method} {url}"
            )


DETAIL_ENDPOINTS = [
    ("GET", "/api/v1/jobs/{job_id}/"),
    ("PATCH", "/api/v1/jobs/{job_id}/"),
    ("DELETE", "/api/v1/jobs/{job_id}/"),
    ("GET", "/api/v1/customers/{customer_id}/"),
    ("PATCH", "/api/v1/customers/{customer_id}/"),
    ("DELETE", "/api/v1/customers/{customer_id}/"),
    ("GET", "/api/v1/devices/{device_id}/"),
    ("GET", "/api/v1/invoices/{invoice_id}/"),
    ("GET", "/api/v1/payments/{payment_id}/"),
    ("GET", "/api/v1/staff/{staff_id}/"),
]


@pytest.mark.parametrize("method,url_template", DETAIL_ENDPOINTS)
def test_isolation_sweep_cross_shop_access_forbidden_or_not_found(
    world, client_for, shop_entities, method, url_template
):
    """
    Assert that an authenticated user from Shop B (Owner B) can NEVER access or mutate
    any entity belonging to Shop A. Must strictly return 404 Not Found (or 403).
    """
    url = resolve_url(url_template, shop_entities)
    client_b = client_for(world.owner_b, world.shop_b)

    if method == "GET":
        resp = client_b.get(url)
    elif method == "PATCH":
        resp = client_b.patch(url, {"name": "Hacked", "fault_description": "Hacked"}, format="json")
    elif method == "DELETE":
        resp = client_b.delete(url)
    else:
        raise ValueError(f"Unsupported method {method}")

    assert resp.status_code in (status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN), (
        f"Cross-shop access breach on {method} {url}: expected 404/403, got {resp.status_code}"
    )
