from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.core.models import IdempotencyRecord


class Command(BaseCommand):
    help = "Delete idempotency records older than 48 hours."

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(hours=48)
        deleted, _ = IdempotencyRecord.objects.filter(created_at__lt=cutoff).delete()
        self.stdout.write(f"Deleted {deleted} idempotency records")
