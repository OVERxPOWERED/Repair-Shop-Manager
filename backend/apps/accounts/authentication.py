from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken

from apps.accounts.models import UserDevice


class DeviceJWTAuthentication(JWTAuthentication):
    """Rejects access tokens whose device was logged out or whose token family was rotated."""

    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        alive = UserDevice.objects.filter(
            user=user,
            device_id=validated_token.get("did"),
            refresh_family=validated_token.get("fam"),
            revoked_at__isnull=True,
        ).exists()
        if not alive:
            raise InvalidToken("Session has been revoked.")
        return user


try:
    from drf_spectacular.extensions import OpenApiAuthenticationExtension

    class DeviceJWTScheme(OpenApiAuthenticationExtension):
        target_class = "apps.accounts.authentication.DeviceJWTAuthentication"
        name = "jwtAuth"

        def get_security_definition(self, auto_schema):
            return {
                "type": "http",
                "scheme": "bearer",
                "bearerFormat": "JWT",
            }
except ImportError:
    pass
