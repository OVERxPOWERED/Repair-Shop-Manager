from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.tenancy.views import (
    OnboardShopView,
    RoleViewSet,
    ShopViewSet,
    StaffMembershipViewSet,
)

router = DefaultRouter()
router.register(r"shops", ShopViewSet, basename="shop")
router.register(r"roles", RoleViewSet, basename="role")
router.register(r"staff", StaffMembershipViewSet, basename="staff")

urlpatterns = [
    path("tenancy/onboard/", OnboardShopView.as_view(), name="tenancy-onboard"),
    path("", include(router.urls)),
]
