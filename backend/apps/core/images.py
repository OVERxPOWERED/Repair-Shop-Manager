from io import BytesIO

from PIL import Image, ImageOps

from apps.core.api.errors import DomainError

MAX_UPLOAD_BYTES = 8 * 1024 * 1024
MAX_SIDE = 1600


def normalise_photo(fileobj) -> tuple[bytes, int, int]:
    """Validates an upload is a real image, fixes rotation, strips metadata (GPS!), resizes, re-encodes JPEG."""
    size = getattr(fileobj, "size", None)
    if size is None:
        try:
            size = fileobj.getbuffer().nbytes
        except AttributeError:
            fileobj.seek(0, 2)
            size = fileobj.tell()
            fileobj.seek(0)

    if size > MAX_UPLOAD_BYTES:
        raise DomainError("Photo is too large (max 8 MB).", code="upload.too_large", status=400)

    try:
        image = Image.open(fileobj)
        image.verify()
        fileobj.seek(0)
        image = ImageOps.exif_transpose(Image.open(fileobj)).convert("RGB")
    except Exception:
        raise DomainError("This file is not a supported image.", code="upload.invalid_image", status=400) from None

    image.thumbnail((MAX_SIDE, MAX_SIDE))
    out = BytesIO()
    image.save(out, format="JPEG", quality=80, optimize=True)  # no EXIF is written
    return out.getvalue(), image.width, image.height
