"""
Management command to process due account deletion requests.
Runs periodically (e.g., via cron) to anonymize users whose deletion grace period has expired.
"""

from django.core.management.base import BaseCommand

from apps.accounts.services import process_due_account_deletions


class Command(BaseCommand):
    help = "Process due account deletion requests and anonymize users whose grace period has expired."

    def handle(self, *args, **options):
        self.stdout.write("Checking for due account deletion requests...")
        count = process_due_account_deletions()
        self.stdout.write(self.style.SUCCESS(f"Successfully processed and anonymized {count} account(s)."))
