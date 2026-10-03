from django.db import migrations


def seed_job_counters(apps, schema_editor):
    Shop = apps.get_model("tenancy", "Shop")
    JobCounter = apps.get_model("jobs", "JobCounter")

    for shop in Shop.objects.all():
        JobCounter.objects.get_or_create(shop=shop, defaults={"last_job_no": 0})


def reverse_noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("jobs", "0001_initial"),
        ("tenancy", "0004_seed_shop_catalogs"),
    ]

    operations = [
        migrations.RunPython(seed_job_counters, reverse_code=reverse_noop),
    ]
