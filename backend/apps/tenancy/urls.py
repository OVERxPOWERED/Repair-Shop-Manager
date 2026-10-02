from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.tenancy import views

router = DefaultRouter()
router.register("roles", views.RoleViewSet, basename="role")
router.register("staff", views.StaffViewSet, basename="staff")

urlpatterns = [
    path("tenancy/onboard/", views.OnboardShopView.as_view(), name="tenancy-onboard"),
    path("shops/", views.MyShopsView.as_view(), name="my-shops"),
    path("shops/current/", views.CurrentShopView.as_view(), name="current-shop"),
    *router.urls,
]
