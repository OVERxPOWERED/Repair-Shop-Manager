"""
rebuild_stock_cache management command.
Audits and reconciles cached Item.qty_on_hand against the immutable StockMovement ledger.
"""

from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db.models import Sum

from apps.inventory.models import Item, StockMovement
from apps.tenancy.models import Shop


class Command(BaseCommand):
    help = "Recomputes and reconciles cached item stock balances from the immutable StockMovement ledger."

    def add_arguments(self, parser):
        parser.add_argument(
            "--shop-id",
            type=str,
            help="Limit stock cache audit to a specific shop UUID.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report discrepancies without writing fixes to the database.",
        )

    def handle(self, *args, **options):
        shop_id = options.get("shop_id")
        dry_run = options.get("dry_run", False)

        items_qs = Item.all_objects.all()
        if shop_id:
            try:
                shop = Shop.objects.get(pk=shop_id)
                items_qs = items_qs.filter(shop=shop)
            except Shop.DoesNotExist:
                self.stderr.write(self.style.ERROR(f"Shop with id '{shop_id}' not found."))
                return

        total_checked = 0
        discrepancies_found = 0

        self.stdout.write(f"Auditing stock cache for {items_qs.count()} item(s)...")

        for item in items_qs.iterator(chunk_size=500):
            total_checked += 1
            ledger_total = StockMovement.objects.filter(item=item).aggregate(total=Sum("quantity"))["total"] or Decimal(
                "0.000"
            )

            if item.qty_on_hand != ledger_total:
                discrepancies_found += 1
                msg = (
                    f"Item '{item.name}' (id={item.id}): cached={item.qty_on_hand}, "
                    f"ledger={ledger_total} (diff={ledger_total - item.qty_on_hand:+})"
                )
                self.stdout.write(self.style.WARNING(msg))

                if not dry_run:
                    item.qty_on_hand = ledger_total
                    item.save(update_fields=["qty_on_hand", "updated_at"])

        if discrepancies_found == 0:
            self.stdout.write(
                self.style.SUCCESS(f"Audit complete: all {total_checked} item(s) are in 100% agreement with ledger.")
            )
        else:
            action = "detected (dry run, not modified)" if dry_run else "reconciled and corrected"
            self.stdout.write(
                self.style.SUCCESS(
                    f"Audit complete: {discrepancies_found} discrepancy(s) out of {total_checked} item(s) {action}."
                )
            )
