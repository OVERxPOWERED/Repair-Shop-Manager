import django_filters
from django.db.models import Q

from apps.jobs.models import Job
from apps.jobs.state_machine import GROUPS


class JobFilter(django_filters.FilterSet):
    status = django_filters.CharFilter(method="filter_status")
    group = django_filters.CharFilter(method="filter_group")
    assigned_to = django_filters.CharFilter(method="filter_assigned_to")
    customer = django_filters.UUIDFilter(field_name="customer_id")
    created_after = django_filters.DateTimeFilter(field_name="created_at", lookup_expr="gte")
    created_before = django_filters.DateTimeFilter(field_name="created_at", lookup_expr="lte")
    q = django_filters.CharFilter(method="filter_q")

    class Meta:
        model = Job
        fields = ["status", "group", "assigned_to", "customer", "created_after", "created_before", "q"]

    def filter_status(self, queryset, name, value):
        if not value:
            return queryset
        statuses = [s.strip() for s in value.split(",") if s.strip()]
        return queryset.filter(status__in=statuses)

    def filter_group(self, queryset, name, value):
        if not value:
            return queryset
        grp = value.strip().lower()
        if grp in GROUPS:
            return queryset.filter(status__in=GROUPS[grp])
        return queryset.none()

    def filter_assigned_to(self, queryset, name, value):
        if not value:
            return queryset
        val = value.strip()
        if val.lower() == "me":
            membership = getattr(self.request, "membership", None)
            if membership:
                return queryset.filter(assigned_to=membership)
            return queryset.none()
        if val.lower() == "unassigned":
            return queryset.filter(assigned_to__isnull=True)
        return queryset.filter(assigned_to_id=val)

    def filter_q(self, queryset, name, value):
        if not value:
            return queryset
        clean = value.strip()
        stripped = clean.lstrip("#")
        if stripped.isdigit():
            digits = stripped
            if len(digits) <= 6:
                return queryset.filter(
                    Q(job_no=int(digits))
                    | Q(customer__phone__contains=digits)
                    | Q(device__identifiers__value__endswith=digits)
                ).distinct()
            else:
                return queryset.filter(
                    Q(customer__phone__contains=digits) | Q(device__identifiers__value__contains=digits)
                ).distinct()
        else:
            return queryset.filter(Q(customer__name__icontains=clean) | Q(device__model__icontains=clean)).distinct()
