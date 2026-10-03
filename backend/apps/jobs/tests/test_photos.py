from io import BytesIO

import pytest
from django.core.files.storage import default_storage, storages
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from PIL import Image

from apps.accounts.tests.factories import UserFactory
from apps.audit.models import AuditLog
from apps.customers.models import Customer
from apps.devices.models import Device
from apps.jobs.models import Job, JobPhoto
from apps.tenancy.models import Membership, Role

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def override_storage(settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    settings.STORAGES = {
        "default": {
            "BACKEND": "django.core.files.storage.FileSystemStorage",
            "OPTIONS": {"location": str(tmp_path)},
        },
        "staticfiles": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    }
    # Reset storages cache so default_storage points to the tmp_path storage
    storages._storages.clear()


@pytest.fixture
def test_job(world):
    cust = Customer.objects.create(shop=world.shop_a, name="Anita Roy", phone="+919876543210")
    dev = Device.objects.create(shop=world.shop_a, customer=cust, category="mobile", model="Pixel 7")
    return Job.objects.create(
        shop=world.shop_a,
        job_no=101,
        customer=cust,
        device=dev,
        fault_description="Broken display and back glass",
        received_at=timezone.now(),
        created_by=world.owner_a,
    )


def _make_image_file(width=100, height=100, format="JPEG", with_gps=False, filename=None):
    im = Image.new("RGB", (width, height), color=(200, 50, 50))
    buf = BytesIO()
    if with_gps:
        exif = im.getexif()
        # GPS IFD tag 34853 (0x8825)
        gps_ifd = exif.get_ifd(0x8825)
        gps_ifd[1] = "N"
        gps_ifd[2] = ((28, 1), (36, 1), (0, 1))
        gps_ifd[3] = "E"
        gps_ifd[4] = ((77, 1), (12, 1), (0, 1))
        im.save(buf, format=format, exif=exif)
    else:
        im.save(buf, format=format)
    buf.seek(0)
    name = filename or f"test.{format.lower()}"
    return SimpleUploadedFile(name, buf.getvalue(), content_type=f"image/{format.lower()}")


def test_png_with_exif_gps_normalised_to_clean_jpeg(world, client_for, test_job):
    c = client_for(world.owner_a, world.shop_a)
    # 2000 x 1200 PNG with GPS EXIF
    upload = _make_image_file(width=2000, height=1200, format="PNG", with_gps=True, filename="camera_shot.png")

    r = c.post(
        f"/api/v1/jobs/{test_job.id}/photos/",
        {"file": upload, "kind": "damage", "caption": "Corner crack"},
        format="multipart",
    )
    assert r.status_code == 201, r.json()
    data = r.json()["data"]
    assert data["kind"] == "damage"
    assert data["caption"] == "Corner crack"
    assert data["width"] == 1600
    assert data["height"] == 960
    assert data["url"] != ""

    photo = JobPhoto.objects.get(id=data["id"])
    assert photo.shop == world.shop_a
    assert photo.job == test_job
    assert str(world.shop_a.id) in photo.file_key
    assert photo.file_key.endswith(".jpg")

    # Verify physical file: stored as JPEG and EXIF is completely stripped
    with default_storage.open(photo.file_key, "rb") as f:
        stored_im = Image.open(f)
        assert stored_im.format == "JPEG"
        exif = stored_im.getexif()
        # GPS IFD 0x8825 should not exist
        assert 0x8825 not in exif

    # Audit log
    audit = AuditLog.objects.filter(action="job.photo_added", entity_id=str(photo.id)).first()
    assert audit is not None
    assert audit.after["photo_id"] == str(photo.id)
    assert audit.after["kind"] == "damage"


def test_text_file_renamed_jpg_rejected(world, client_for, test_job):
    c = client_for(world.owner_a, world.shop_a)
    fake_file = SimpleUploadedFile("fake.jpg", b"hello this is not an image at all", content_type="image/jpeg")

    r = c.post(
        f"/api/v1/jobs/{test_job.id}/photos/",
        {"file": fake_file, "kind": "before"},
        format="multipart",
    )
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "upload.invalid_image"


def test_upload_exceeding_8mb_rejected(world, client_for, test_job):
    c = client_for(world.owner_a, world.shop_a)
    huge_bytes = b"X" * (9 * 1024 * 1024)
    huge_file = SimpleUploadedFile("huge.jpg", huge_bytes, content_type="image/jpeg")

    r = c.post(
        f"/api/v1/jobs/{test_job.id}/photos/",
        {"file": huge_file, "kind": "before"},
        format="multipart",
    )
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "upload.too_large"


def test_photo_limit_20(world, client_for, test_job):
    c = client_for(world.owner_a, world.shop_a)

    # Upload 20 valid small photos
    for i in range(20):
        up = _make_image_file(width=50, height=50, format="JPEG", filename=f"photo_{i}.jpg")
        r = c.post(f"/api/v1/jobs/{test_job.id}/photos/", {"file": up, "kind": "before"}, format="multipart")
        assert r.status_code == 201

    assert test_job.photos.filter(deleted_at__isnull=True).count() == 20

    # 21st photo rejected with 422 job.photo_limit
    up21 = _make_image_file(width=50, height=50, format="JPEG", filename="photo_21.jpg")
    r21 = c.post(f"/api/v1/jobs/{test_job.id}/photos/", {"file": up21, "kind": "before"}, format="multipart")
    assert r21.status_code == 422
    assert r21.json()["error"]["code"] == "job.photo_limit"


def test_cross_shop_isolation(world, client_for, test_job):
    c_owner_a = client_for(world.owner_a, world.shop_a)
    up = _make_image_file(width=80, height=80, format="JPEG")
    r = c_owner_a.post(f"/api/v1/jobs/{test_job.id}/photos/", {"file": up, "kind": "before"}, format="multipart")
    assert r.status_code == 201
    photo_id = r.json()["data"]["id"]

    # Owner B from Shop B attempts to view photos of Job A
    c_owner_b = client_for(world.owner_b, world.shop_b)
    r_list = c_owner_b.get(f"/api/v1/jobs/{test_job.id}/photos/")
    assert r_list.status_code == 404

    # Owner B from Shop B attempts to delete photo from Job A
    r_del = c_owner_b.delete(f"/api/v1/jobs/{test_job.id}/photos/{photo_id}/")
    assert r_del.status_code == 404

    # Photo is still present in Shop A
    assert JobPhoto.objects.filter(id=photo_id, deleted_at__isnull=True).exists()


def test_delete_photo_soft_deletes(world, client_for, test_job):
    c = client_for(world.owner_a, world.shop_a)
    up = _make_image_file(width=60, height=60, format="JPEG")
    r = c.post(f"/api/v1/jobs/{test_job.id}/photos/", {"file": up, "kind": "after"}, format="multipart")
    photo_id = r.json()["data"]["id"]

    # Delete photo
    r_del = c.delete(f"/api/v1/jobs/{test_job.id}/photos/{photo_id}/")
    assert r_del.status_code == 204

    # Verify soft deleted in DB
    photo = JobPhoto.all_objects.get(id=photo_id)
    assert photo.deleted_at is not None

    # Listing photos returns empty
    r_get = c.get(f"/api/v1/jobs/{test_job.id}/photos/")
    assert r_get.status_code == 200
    assert len(r_get.json()["data"]) == 0

    # Audit log
    audit = AuditLog.objects.filter(action="job.photo_deleted", entity_id=str(photo_id)).first()
    assert audit is not None


def test_photo_permissions(world, client_for, test_job):
    # Role with only jobs.view (no jobs.edit)
    viewer_role = Role.objects.create(organization=world.org_a, name="Viewer", permissions=["jobs.view"])
    u = UserFactory()
    Membership.objects.create(user=u, shop=world.shop_a, role=viewer_role, status=Membership.StatusChoices.ACTIVE)
    c_viewer = client_for(u, world.shop_a)

    # Viewer can GET photos
    r_get = c_viewer.get(f"/api/v1/jobs/{test_job.id}/photos/")
    assert r_get.status_code == 200

    # Viewer CANNOT upload photo
    up = _make_image_file(width=60, height=60, format="JPEG")
    r_post = c_viewer.post(f"/api/v1/jobs/{test_job.id}/photos/", {"file": up, "kind": "before"}, format="multipart")
    assert r_post.status_code == 403
    assert r_post.json()["error"]["code"] == "permission.denied"
