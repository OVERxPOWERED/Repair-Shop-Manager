from django.urls import path

from apps.accounts import views

urlpatterns = [
    path("auth/otp/send/", views.SendOTPView.as_view(), name="auth-otp-send"),
    path("auth/otp/verify/", views.VerifyOTPView.as_view(), name="auth-otp-verify"),
    path("auth/token/refresh/", views.RefreshView.as_view(), name="auth-token-refresh"),
    path("auth/me/", views.MeView.as_view(), name="auth-me"),
    path("auth/logout/", views.LogoutView.as_view(), name="auth-logout"),
    path("auth/logout-all/", views.LogoutAllView.as_view(), name="auth-logout-all"),
    path("auth/devices/", views.DeviceListView.as_view(), name="auth-devices"),
    path("auth/devices/<uuid:pk>/", views.DeviceRevokeView.as_view(), name="auth-device-revoke"),
    path("auth/account-deletion/", views.AccountDeletionView.as_view(), name="auth-account-deletion"),
]
