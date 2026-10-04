"""
Role definitions, permission codes, and DRF permission classes for FixPro.
Derives directly from docs/02-database-schema.md Section 8.
"""

from rest_framework import permissions

# All standard permission codes
PERMISSION_CODES = {
    # Jobs
    "jobs.view": "View repair jobs",
    "jobs.view_all": "View all shop jobs regardless of assignment",
    "jobs.create": "Create a new digital job sheet",
    "jobs.edit": "Edit repair job details",
    "jobs.change_status": "Progress repair through status workflow",
    "jobs.assign": "Assign technician to repair job",
    "jobs.deliver": "Deliver device to customer",
    "jobs.reopen": "Reopen a delivered or closed repair",
    "jobs.delete": "Soft-delete a repair job",
    "jobs.restore": "Restore a repair job from trash",
    "jobs.delete_permanent": "Permanently purge a repair job",
    "jobs.view_device_lock": "View pattern lock or pin password",
    # Customers
    "customers.view": "View customer list and profiles",
    "customers.create": "Add new customer",
    "customers.edit": "Edit customer contact details",
    "customers.see_phone": "View unmasked customer phone number",
    "customers.delete": "Delete customer profile",
    # Invoices & Billing
    "invoices.view": "View invoices and estimates",
    "invoices.create_draft": "Create draft estimate/invoice",
    "invoices.issue": "Issue immutable tax invoice",
    "invoices.cancel": "Cancel/Credit-note an issued invoice",
    "invoices.print": "Print A4 or thermal invoice receipt",
    # Payments & Money
    "payments.view": "View payment history",
    "payments.record": "Record payment received (Cash, UPI, Card)",
    "payments.refund": "Issue refund for payment",
    "money.see_cost_profit": "See wholesale part costs and profit margins",
    "reports.view_basic": "View basic daily intake/turnaround reports",
    "reports.view_profit": "View comprehensive profit and loss reports",
    # Data
    "data.export": "Export customer or repair data to Excel/PDF",
    "data.bulk_delete": "Bulk purge records",
    # Shop Administration
    "staff.view": "View staff member list",
    "staff.manage": "Invite, edit, or remove staff members",
    "roles.manage": "Manage custom roles and permissions",
    "shop.settings": "Update shop profile, GST settings, and brand configuration",
    "printers.configure": "Configure Bluetooth thermal printers",
    "billing.subscription": "Manage FixPro subscription and billing",
    "audit.view": "View the shop audit log",
    # Inventory & Stock (P2)
    "inventory.view": "View inventory items and stock levels",
    "inventory.edit": "Create and edit inventory items, categories, and suppliers",
    "stock.adjust": "Record manual stock adjustments and movements",
}

# Predefined role permission matrices
SYSTEM_ROLES = {
    "Owner": list(PERMISSION_CODES.keys()),
    "Manager": [
        code
        for code in PERMISSION_CODES
        if code
        not in (
            "jobs.delete_permanent",
            "data.bulk_delete",
            "roles.manage",
            "billing.subscription",
            "audit.view",
        )
    ],
    "Front Desk": [
        "jobs.view",
        "jobs.view_all",
        "jobs.create",
        "jobs.edit",
        "jobs.change_status",
        "jobs.assign",
        "jobs.deliver",
        "jobs.view_device_lock",
        "customers.view",
        "customers.create",
        "customers.edit",
        "customers.see_phone",
        "invoices.view",
        "invoices.create_draft",
        "invoices.issue",
        "invoices.print",
        "payments.view",
        "payments.record",
        "reports.view_basic",
        "staff.view",
        "printers.configure",
        "inventory.view",
    ],
    "Engineer": [
        "jobs.view",
        "jobs.create",
        "jobs.edit",
        "jobs.change_status",
        "jobs.view_device_lock",
        "customers.view",
        "invoices.view",
        "invoices.print",
        "printers.configure",
        "inventory.view",
    ],
}


ANY_MEMBER = "__any_member__"  # permission_map value: any active member of the shop


class IsShopMember(permissions.BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        from apps.tenancy.context import resolve_shop_context

        resolve_shop_context(request)
        return True


class HasShopPermission(permissions.BasePermission):
    """Deny by default: the view must map the current action to a permission code."""

    message = "You do not have permission to do this."

    def has_permission(self, request, view):
        membership = getattr(request, "membership", None)
        code = view.get_required_permission()
        if membership is None or code is None:
            return False
        return code == ANY_MEMBER or membership.has_perm(code)
