from django.contrib import admin

from apps.devices.models import Device, DeviceIdentifier


class DeviceIdentifierInline(admin.TabularInline):
    model = DeviceIdentifier
    extra = 0


@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = ("__str__", "category", "customer", "shop", "created_at")
    list_filter = ("shop", "category")
    search_fields = ("model", "brand_text", "customer__name")
    inlines = [DeviceIdentifierInline]


@admin.register(DeviceIdentifier)
class DeviceIdentifierAdmin(admin.ModelAdmin):
    list_display = ("type", "value", "device", "shop", "luhn_valid")
    list_filter = ("shop", "type", "luhn_valid")
    search_fields = ("value",)
