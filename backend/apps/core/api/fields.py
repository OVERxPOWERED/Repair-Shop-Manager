from rest_framework import serializers


class ShopScopedPKField(serializers.PrimaryKeyRelatedField):
    """Accepts only objects of request.shop. Another shop's ID fails like a nonexistent ID."""

    def get_queryset(self):
        request = self.context.get("request")
        shop = getattr(request, "shop", None)
        queryset = super().get_queryset()
        return queryset.filter(shop=shop) if shop is not None else queryset.none()
