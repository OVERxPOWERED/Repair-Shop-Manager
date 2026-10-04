from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.accounts import public_views

urlpatterns = [
    path("admin/", admin.site.urls),
    # API Documentation
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    # Public tracking (outside /api/v1/)
    path("t/", include("apps.tracking.urls")),
    # Public legal and compliance pages
    path("account/delete/", public_views.account_deletion_page, name="public-account-deletion"),
    path("privacy/", public_views.privacy_policy_page, name="public-privacy-policy"),
    path("terms/", public_views.terms_of_service_page, name="public-terms-of-service"),
    # API Version 1
    path("api/v1/", include("apps.core.urls")),
    path("api/v1/", include("apps.accounts.urls")),
    path("api/v1/", include("apps.tenancy.urls")),
    path("api/v1/", include("apps.audit.urls")),
    path("api/v1/", include("apps.customers.urls")),
    path("api/v1/", include("apps.devices.urls")),
    path("api/v1/", include("apps.jobs.urls")),
    path("api/v1/", include("apps.billing.urls")),
    path("api/v1/", include("apps.documents.urls")),
    path("api/v1/", include("apps.messaging.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
