from datetime import timedelta

from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.billing.models import Invoice, Payment
from apps.customers.models import Customer
from apps.jobs.models import Job, JobPhoto


class Command(BaseCommand):
    help = "Hard-delete non-financial soft-deleted rows and orphaned photos older than 30 days."

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=30,
            help="Days threshold for soft-deleted purge (default: 30)",
        )

    def handle(self, *args, **options):
        days = options.get("days", 30)
        cutoff = timezone.now() - timedelta(days=days)

        # 1. Purge eligible soft-deleted jobs older than cutoff
        # TODO(verify) retention with the CA before deleting anything financial
        deleted_jobs = Job.all_objects.filter(deleted_at__lt=cutoff)
        purged_jobs_count = 0
        purged_photos_count = 0

        for job in deleted_jobs:
            has_financial = Payment.all_objects.filter(job=job).exists() or Invoice.all_objects.filter(job=job).exists()
            if not has_financial:
                # Delete associated photos (storage file + rows)
                for photo in JobPhoto.all_objects.filter(job=job):
                    if photo.file_key:
                        try:
                            if default_storage.exists(photo.file_key):
                                default_storage.delete(photo.file_key)
                        except Exception as exc:
                            self.stderr.write(f"Failed to delete storage file {photo.file_key}: {exc}")
                    photo.hard_delete()
                    purged_photos_count += 1

                job.hard_delete()
                purged_jobs_count += 1

        # 2. Clean orphaned job photos (soft-deleted > cutoff)
        orphaned_photos = JobPhoto.all_objects.filter(deleted_at__lt=cutoff)
        for photo in orphaned_photos:
            if photo.file_key:
                try:
                    if default_storage.exists(photo.file_key):
                        default_storage.delete(photo.file_key)
                except Exception as exc:
                    self.stderr.write(f"Failed to delete storage file {photo.file_key}: {exc}")
            photo.hard_delete()
            purged_photos_count += 1

        # 3. Purge eligible soft-deleted customers older than cutoff
        deleted_customers = Customer.all_objects.filter(deleted_at__lt=cutoff)
        purged_customers_count = 0

        for customer in deleted_customers:
            has_financial_or_jobs = (
                Job.all_objects.filter(customer=customer).exists()
                or Payment.all_objects.filter(customer=customer).exists()
                or Invoice.all_objects.filter(customer=customer).exists()
            )
            if not has_financial_or_jobs:
                customer.hard_delete()
                purged_customers_count += 1

        self.stdout.write(
            f"Purge complete: {purged_jobs_count} jobs, {purged_photos_count} photos, "
            f"{purged_customers_count} customers hard-deleted."
        )
