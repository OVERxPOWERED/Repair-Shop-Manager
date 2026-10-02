from django.core.management.base import BaseCommand

from apps.tenancy.services import seed_system_roles


class Command(BaseCommand):
    help = "Seed or update default system roles."

    def handle(self, *args, **options):
        roles = seed_system_roles()
        names = ", ".join(roles.keys())
        self.stdout.write(f"Seeded {len(roles)} system roles: {names}")
