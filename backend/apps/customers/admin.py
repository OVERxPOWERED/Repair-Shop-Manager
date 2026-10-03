from django.contrib import admin

from apps.customers.models import Customer


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ("name", "phone", "shop", "created_at", "updated_at")
    list_filter = ("shop",)
    search_fields = ("name", "phone")
