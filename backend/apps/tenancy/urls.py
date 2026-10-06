from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.tenancy import views

router = DefaultRouter()
router.register("roles", views.RoleViewSet, basename="role")
router.register("staff/requests", views.JoinRequestsViewSet, basename="staff-requests")
router.register("staff", views.StaffViewSet, basename="staff")
router.register("invites", views.InviteViewSet, basename="invite")
router.register("brands", views.ShopBrandViewSet, basename="brand")
router.register("accessory-options", views.AccessoryOptionViewSet, basename="accessory-option")

urlpatterns = [
    path("tenancy/onboard/", views.OnboardShopView.as_view(), name="tenancy-onboard"),
    path("shops/", views.MyShopsView.as_view(), name="my-shops"),
    path("shops/current/", views.CurrentShopView.as_view(), name="current-shop"),
    path("shops/current/logo/", views.ShopLogoView.as_view(), name="shop-logo"),
    path("shops/current/join-code/", views.ShopJoinCodeView.as_view(), name="shop-join-code"),
    path("shops/join/", views.JoinShopView.as_view(), name="join-shop"),
    path("me/invites/", views.MyInvitesListView.as_view(), name="my-invites"),
    path("me/invites/<uuid:id>/accept/", views.AcceptInviteView.as_view(), name="accept-invite"),
    path("me/invites/<uuid:id>/decline/", views.DeclineInviteView.as_view(), name="decline-invite"),
    *router.urls,
]
