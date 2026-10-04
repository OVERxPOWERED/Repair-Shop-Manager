"""
seed_demo_data management command.
Populates realistic demo repair shop data for local testing, performance profiling, and app reviews.
"""

import random
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.customers.models import Customer
from apps.devices.models import Device, DeviceIdentifier
from apps.jobs.models import Job, JobCounter, JobStatus
from apps.tenancy.models import Membership, Organization, Role, Shop, ShopBrand
from apps.tenancy.services import seed_system_roles

User = get_user_model()

SAMPLE_BRANDS = [
    ("Samsung", ["Galaxy S23", "Galaxy M34", "Galaxy A14", "Galaxy F54", "Galaxy Z Flip5"]),
    ("Xiaomi", ["Redmi Note 12", "Redmi 12 5G", "Xiaomi 13 Pro", "Poco X5 Pro", "Redmi Note 13 Pro"]),
    ("Apple", ["iPhone 13", "iPhone 14", "iPhone 15 Pro", "iPhone 12", "iPhone 11"]),
    ("Vivo", ["V29 Pro", "Y200", "T2x 5G", "V27", "Y16"]),
    ("Oppo", ["Reno 10", "A78 5G", "F23 5G", "Find N3 Flip", "A58"]),
    ("Realme", ["Realme 11 Pro+", "Realme Narzo 60", "Realme C55", "Realme GT 2", "Realme 10"]),
    ("OnePlus", ["OnePlus 11R", "OnePlus Nord CE 3 Lite", "OnePlus 12", "OnePlus Open", "Nord 3"]),
]

SAMPLE_FAULTS = [
    "Screen cracked / Touch not responding after drop.",
    "Battery drains completely within 2 hours of normal usage.",
    "Type-C charging port loose, device only charges when cable held at angle.",
    "No audio during cellular calls; loudspeaker works fine.",
    "Device water damaged in rain; power cycle loop.",
    "Camera glass shattered; main camera photos blurry and unfocused.",
    "Power button stuck; unable to lock or turn device on/off.",
    "Volume down key stuck, phone continuously boots into recovery mode.",
    "Display blank with black screen; phone vibrates on incoming calls.",
    "Fingerprint sensor failing to register or recognize.",
]

FIRST_NAMES = [
    "Aarav",
    "Rohan",
    "Pooja",
    "Vikram",
    "Sneha",
    "Rahul",
    "Priya",
    "Amit",
    "Neha",
    "Rajesh",
    "Kavita",
    "Suresh",
    "Anjali",
    "Manish",
    "Deepa",
    "Sunil",
    "Ritu",
    "Deepak",
    "Swati",
    "Sanjay",
    "Meera",
    "Ajay",
    "Preeti",
]

LAST_NAMES = [
    "Sharma",
    "Verma",
    "Patel",
    "Gupta",
    "Singh",
    "Yadav",
    "Kumar",
    "Joshi",
    "Mishra",
    "Shah",
    "Mehta",
    "Chauhan",
    "Agarwal",
    "Reddy",
    "Nair",
    "Iyer",
]


def generate_luhn_imei(prefix_14: str) -> str:
    """Computes Luhn check digit for a 14-digit prefix."""
    digits = [int(c) for c in prefix_14]
    total = 0
    for i, d in enumerate(digits):
        if i % 2 == 1:
            doubled = d * 2
            total += doubled if doubled < 10 else (doubled - 9)
        else:
            total += d
    check = (10 - (total % 10)) % 10
    return f"{prefix_14}{check}"


class Command(BaseCommand):
    help = "Seed demo data for performance profiling and reviewer accounts."

    def add_arguments(self, parser):
        parser.add_argument("--jobs", type=int, default=100, help="Number of jobs to seed (default: 100)")
        parser.add_argument("--shop-name", type=str, default="FixPro Demo", help="Shop name (default: FixPro Demo)")
        parser.add_argument(
            "--phone", type=str, default="+919876543210", help="Owner phone number (default: +919876543210)"
        )
        parser.add_argument(
            "--reviewer",
            action="store_true",
            help="Seed official App Store / Google Play reviewer account (+919999999999, OTP 123456)",
        )

    def handle(self, *args, **options):
        if options["reviewer"]:
            job_count = options["jobs"] if options["jobs"] != 100 else 25
            shop_name = "FixPro Reviewer Demo"
            owner_phone = "+919999999999"
        else:
            job_count = options["jobs"]
            shop_name = options["shop_name"]
            owner_phone = options["phone"]

        self.stdout.write(f"Seeding demo data with {job_count} jobs for '{shop_name}' ({owner_phone})...")

        seed_system_roles()

        with transaction.atomic():
            owner_user, _ = User.objects.get_or_create(
                phone=owner_phone,
                defaults={"name": "Demo Owner", "preferred_locale": "en", "is_active": True},
            )

            org = Organization.objects.filter(owner_user=owner_user).first()
            if not org:
                org = Organization.objects.create(
                    owner_user=owner_user,
                    name=f"{shop_name} Org",
                )

            shop = Shop.objects.filter(organization=org, name=shop_name).first()
            if not shop:
                shop = Shop.objects.create(
                    organization=org,
                    name=shop_name,
                    shop_type="mobile",
                    phone=owner_phone,
                    city="Indore",
                    state_code="23",
                    pincode="452001",
                    address_line1="Shop 4, MG Road Market",
                )

            owner_role = Role.objects.get(organization=None, name="Owner")
            membership = Membership.objects.filter(shop=shop, user=owner_user).first()
            if not membership:
                Membership.objects.create(
                    shop=shop,
                    user=owner_user,
                    role=owner_role,
                    status=Membership.StatusChoices.ACTIVE,
                )

            # Seed Shop Brands
            brand_map = {}
            for b_name, _ in SAMPLE_BRANDS:
                brand_obj, _ = ShopBrand.objects.get_or_create(
                    shop=shop,
                    name=b_name,
                    device_category="mobile",
                    defaults={"is_active": True},
                )
                brand_map[b_name] = brand_obj

            # Seed Customers
            num_customers = max(20, min(job_count // 2, 500))
            self.stdout.write(f"Generating {num_customers} customers...")
            existing_customers = list(Customer.objects.filter(shop=shop))
            needed = num_customers - len(existing_customers)
            if needed > 0:
                new_custs = []
                for _i in range(needed):
                    fn = random.choice(FIRST_NAMES)
                    ln = random.choice(LAST_NAMES)
                    phone = f"+9198{random.randint(10000000, 99999999)}"
                    new_custs.append(
                        Customer(
                            shop=shop,
                            name=f"{fn} {ln}",
                            phone=phone,
                            preferred_locale=random.choice(["en", "hi", "hi-Latn"]),
                        )
                    )
                Customer.objects.bulk_create(new_custs, ignore_conflicts=True)
                existing_customers = list(Customer.objects.filter(shop=shop))

            # Seed Devices
            self.stdout.write("Generating devices for customers...")
            existing_devices = list(Device.objects.filter(shop=shop))
            needed_devices = len(existing_customers) - len(existing_devices)
            if needed_devices > 0:
                new_devices = []
                for cust in existing_customers[len(existing_devices) :]:
                    b_name, models = random.choice(SAMPLE_BRANDS)
                    b_obj = brand_map.get(b_name)
                    m_name = random.choice(models)
                    new_devices.append(
                        Device(
                            shop=shop,
                            customer=cust,
                            brand=b_obj,
                            model=m_name,
                            category="mobile",
                            color=random.choice(["Black", "Blue", "Green", "White", "Silver"]),
                        )
                    )
                Device.objects.bulk_create(new_devices)
                existing_devices = list(Device.objects.filter(shop=shop))

                # Create Device Identifiers
                device_ids = []
                for dev in existing_devices:
                    if not dev.identifiers.exists():
                        pref = f"86{random.randint(100000000000, 999999999999)}"
                        imei = generate_luhn_imei(pref)
                        device_ids.append(
                            DeviceIdentifier(
                                shop=shop,
                                device=dev,
                                type=DeviceIdentifier.Type.IMEI1,
                                value=imei,
                                luhn_valid=True,
                                captured_via=DeviceIdentifier.CapturedVia.BARCODE,
                            )
                        )
                if device_ids:
                    DeviceIdentifier.objects.bulk_create(device_ids, ignore_conflicts=True)

            # Seed Jobs
            counter, _ = JobCounter.objects.get_or_create(shop=shop, defaults={"last_job_no": 0})
            current_job_no = counter.last_job_no
            now = timezone.now()

            statuses = [
                JobStatus.RECEIVED,
                JobStatus.DIAGNOSING,
                JobStatus.IN_REPAIR,
                JobStatus.AWAITING_PARTS,
                JobStatus.REPAIRED,
                JobStatus.READY_FOR_PICKUP,
                JobStatus.DELIVERED,
            ]

            jobs_to_create = []
            for _i in range(job_count):
                current_job_no += 1
                cust = random.choice(existing_customers)
                dev = random.choice(existing_devices)
                stat = random.choice(statuses)
                days_ago = random.randint(0, 45)
                created_at = now - timedelta(days=days_ago, hours=random.randint(0, 12))
                exp_date = (created_at + timedelta(days=random.randint(1, 4))).date()

                delivered_at = (
                    (created_at + timedelta(days=random.randint(1, 3))) if stat == JobStatus.DELIVERED else None
                )
                estimate = random.choice([50000, 80000, 120000, 150000, 250000, 400000])
                is_completed = stat in (JobStatus.REPAIRED, JobStatus.READY_FOR_PICKUP, JobStatus.DELIVERED)
                total = estimate if is_completed else 0

                jobs_to_create.append(
                    Job(
                        shop=shop,
                        customer=cust,
                        device=dev,
                        job_no=current_job_no,
                        status=stat,
                        fault_description=random.choice(SAMPLE_FAULTS),
                        estimate_paise=estimate,
                        total_paise=total,
                        cost_paise=int(estimate * 0.4),
                        expected_date=exp_date,
                        delivered_at=delivered_at,
                        received_at=created_at,
                        created_at=created_at,
                        updated_at=created_at,
                    )
                )

                if len(jobs_to_create) >= 2000:
                    Job.objects.bulk_create(jobs_to_create)
                    self.stdout.write(f"  Inserted batch of {len(jobs_to_create)} jobs...")
                    jobs_to_create = []

            if jobs_to_create:
                Job.objects.bulk_create(jobs_to_create)
                self.stdout.write(f"  Inserted final batch of {len(jobs_to_create)} jobs...")

            counter.last_job_no = current_job_no
            counter.save(update_fields=["last_job_no"])

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully seeded {job_count} demo jobs for shop '{shop_name}' (Total jobs: {current_job_no})."
            )
        )
