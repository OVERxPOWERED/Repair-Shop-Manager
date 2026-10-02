from django.core.management.base import BaseCommand

from apps.accounts.services import purge_old_otp_challenges


class Command(BaseCommand):
    help = "Delete OTP challenges older than 7 days."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=7, help="Number of days to keep (default: 7)")

    def handle(self, *args, **options):
        days = options.get("days", 7)
        deleted = purge_old_otp_challenges(days=days)
        self.stdout.write(f"Deleted {deleted} OTP challenges older than {days} days")
