from io import BytesIO

from PIL import Image, ImageOps

from apps.core.api.errors import DomainError

MAX_UPLOAD_BYTES = 8 * 1024 * 1024
MAX_SIDE = 1600


def normalise_photo(fileobj, max_side: int = MAX_SIDE, allow_png: bool = False) -> tuple[bytes, int, int]:
    """Validates an upload is a real image, fixes rotation, strips metadata (GPS!), resizes, re-encodes JPEG/PNG."""
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
        raw_img = Image.open(fileobj)
        image = ImageOps.exif_transpose(raw_img)
        is_png = allow_png and (
            raw_img.format == "PNG" or image.mode in ("RGBA", "LA", "P") or "transparency" in image.info
        )
        image = image.convert("RGBA") if is_png else image.convert("RGB")
    except Exception:
        raise DomainError("This file is not a supported image.", code="upload.invalid_image", status=400) from None

    image.thumbnail((max_side, max_side))
    out = BytesIO()
    if is_png:
        image.save(out, format="PNG", optimize=True)
    else:
        image.save(out, format="JPEG", quality=80, optimize=True)  # no EXIF is written
    return out.getvalue(), image.width, image.height
