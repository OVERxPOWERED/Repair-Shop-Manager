from django.db import migrations

DEFAULT_BRANDS = {
    "mobile": [
        "Samsung",
        "Apple",
        "Xiaomi",
        "Redmi",
        "Vivo",
        "Oppo",
        "Realme",
        "OnePlus",
        "Motorola",
        "Nokia",
        "Poco",
        "iQOO",
        "Infinix",
        "Tecno",
        "Lava",
        "Google",
        "Nothing",
    ],
    "laptop": ["HP", "Dell", "Lenovo", "Asus", "Acer", "Apple", "MSI"],
    "tv": ["Samsung", "LG", "Sony", "Mi", "TCL", "OnePlus", "Panasonic"],
    "appliance": ["LG", "Samsung", "Whirlpool", "Godrej", "Voltas", "Bajaj"],
}

DEFAULT_ACCESSORIES = [
    ("SIM tray", True),
    ("SIM card", False),
    ("Memory card", False),
    ("Back cover / case", False),
    ("Charger", False),
    ("Cable", False),
    ("Battery", False),
    ("Box", False),
    ("Earphones", False),
]


def seed_existing_shops(apps, schema_editor):
    Shop = apps.get_model("tenancy", "Shop")
    ShopBrand = apps.get_model("tenancy", "ShopBrand")
    AccessoryOption = apps.get_model("tenancy", "AccessoryOption")

    for shop in Shop.objects.all():
        if not ShopBrand.objects.filter(shop=shop).exists():
            brands = []
            for category, brand_names in DEFAULT_BRANDS.items():
                for idx, name in enumerate(brand_names):
                    brands.append(
                        ShopBrand(
                            shop=shop,
                            device_category=category,
                            name=name,
                            sort_order=idx + 1,
                            is_active=True,
                        )
                    )
            if brands:
                ShopBrand.objects.bulk_create(brands, ignore_conflicts=True)

        if not AccessoryOption.objects.filter(shop=shop).exists():
            accessories = []
            for idx, (name, is_default) in enumerate(DEFAULT_ACCESSORIES):
                accessories.append(
                    AccessoryOption(
                        shop=shop,
                        name=name,
                        is_default=is_default,
                        sort_order=idx + 1,
                    )
                )
            if accessories:
                AccessoryOption.objects.bulk_create(accessories, ignore_conflicts=True)


def unseed_existing_shops(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("tenancy", "0003_accessoryoption_shopbrand"),
    ]

    operations = [
        migrations.RunPython(seed_existing_shops, unseed_existing_shops),
    ]
