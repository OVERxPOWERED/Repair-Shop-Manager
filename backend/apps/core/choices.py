from django.db import models
from django.utils.translation import gettext_lazy as _


class DeviceCategory(models.TextChoices):
    MOBILE = "mobile", _("Mobile")
    LAPTOP = "laptop", _("Laptop / Computer")
    TV = "tv", _("TV")
    APPLIANCE = "appliance", _("Appliance")
    OTHER = "other", _("Other")
