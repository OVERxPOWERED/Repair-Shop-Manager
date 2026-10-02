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
        )
    ],
    "Front Desk": [
        "jobs.view",
        "jobs.view_all",
        "jobs.create",
        "jobs.edit",
        "jobs.change_status",
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
    ],
}


class HasShopPermission(permissions.BasePermission):
    """
    DRF Permission class to check if current user's membership in request.shop
    contains the required permission code.
    Owners always have full permission.
    """

    def __init__(self, required_permission: str | None = None):
        self.required_permission = required_permission
        super().__init__()

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if getattr(request.user, "is_platform_admin", False):
            return True

        # Check tenant context
        membership = getattr(request, "membership", None)
        if not membership or membership.status != "active":
            return False

        # Owner role automatically has all permissions
        if membership.role.name == "Owner":
            return True

        perm = getattr(view, "required_permission", self.required_permission)
        if not perm:
            return True

        return perm in membership.role.permissions
