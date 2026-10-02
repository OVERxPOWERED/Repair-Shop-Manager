from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from apps.accounts.views import SendOTPView, UserProfileView, VerifyOTPView

urlpatterns = [
    path("auth/otp/send/", SendOTPView.as_view(), name="auth-otp-send"),
    path("auth/otp/verify/", VerifyOTPView.as_view(), name="auth-otp-verify"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("auth/me/", UserProfileView.as_view(), name="auth-me"),
]
