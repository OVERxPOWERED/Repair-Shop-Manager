from django.contrib import admin

from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("id", "shop", "job", "direction", "mode", "amount_paise", "received_at")
    list_filter = ("direction", "mode", "received_at")
    search_fields = ("reference", "notes")
