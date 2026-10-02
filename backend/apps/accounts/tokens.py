import logging
import uuid

from django.utils import timezone
from rest_framework_simplejwt.exceptions import InvalidToken, TokenBackendError, TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.state import token_backend
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import UserDevice

logger = logging.getLogger(__name__)


def _revoke_family_if_reused(raw: str) -> None:
    """A correctly signed, unexpired but blacklisted refresh token means it was stolen or replayed."""
    try:
        payload = token_backend.decode(raw, verify=True)
    except TokenBackendError:
        return
    if BlacklistedToken.objects.filter(token__jti=payload.get("jti")).exists():
        logger.warning("Refresh token reuse detected for user %s; revoking device", payload.get("user_id"))
        UserDevice.objects.filter(user_id=payload.get("user_id"), device_id=payload.get("did")).update(
            refresh_family=uuid.uuid4(), revoked_at=timezone.now()
        )


class DeviceAwareTokenRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        raw = attrs["refresh"]
        try:
            token = RefreshToken(raw)  # checks signature, expiry and blacklist
        except TokenError as err:
            _revoke_family_if_reused(raw)
            raise InvalidToken(str(err)) from err
        device = UserDevice.objects.filter(user_id=token.get("user_id"), device_id=token.get("did")).first()
        if device is None or device.revoked_at is not None or str(device.refresh_family) != token.get("fam"):
            raise InvalidToken("Session has been revoked.")
        data = super().validate(attrs)  # rotates and blacklists the old refresh token
        device.last_seen_at = timezone.now()
        device.save(update_fields=["last_seen_at"])
        return data
