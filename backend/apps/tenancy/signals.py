def sync_roles_after_migrate(sender, **kwargs):
    from apps.tenancy.services import seed_system_roles

    seed_system_roles()
