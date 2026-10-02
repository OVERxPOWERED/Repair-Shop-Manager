from django.apps import AppConfig


class TenancyConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.tenancy"
    verbose_name = "Tenancy & Access Control"

    def ready(self):
        from django.db.models.signals import post_migrate

        from apps.tenancy.signals import sync_roles_after_migrate

        post_migrate.connect(sync_roles_after_migrate, sender=self)
