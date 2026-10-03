"""
Views for message template configuration and overrides.
"""

from rest_framework import permissions, status, viewsets
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.response import Response

from apps.audit.services import record_audit
from apps.messaging.models import MessageTemplate, TemplateChannelChoices
from apps.messaging.serializers import MessageTemplateSerializer
from apps.tenancy.permissions import IsShopMember


class MessageTemplateViewSet(viewsets.GenericViewSet):
    """
    Endpoints to list and override message templates for the active shop.
    Permission required: shop.settings
    """

    permission_classes = [permissions.IsAuthenticated, IsShopMember]
    serializer_class = MessageTemplateSerializer

    def get_queryset(self):
        shop = getattr(self.request, "shop", None)
        if not shop:
            return MessageTemplate.objects.filter(shop__isnull=True, is_active=True)

        # Merge platform defaults with any shop-specific overrides
        platform_templates = {
            (t.key, t.channel, t.locale): t for t in MessageTemplate.objects.filter(shop__isnull=True, is_active=True)
        }
        shop_templates = {
            (t.key, t.channel, t.locale): t for t in MessageTemplate.objects.filter(shop=shop, is_active=True)
        }
        merged = {**platform_templates, **shop_templates}
        ids = [t.id for t in merged.values()]
        return MessageTemplate.objects.filter(id__in=ids).order_by("key", "channel", "locale")

    def _check_settings_perm(self):
        membership = getattr(self.request, "membership", None)
        if not membership or not membership.has_perm("shop.settings"):
            raise PermissionDenied("You do not have permission to view or manage shop message templates.")

    def list(self, request, *args, **kwargs):
        self._check_settings_perm()
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None, *args, **kwargs):
        self._check_settings_perm()
        shop = request.shop
        try:
            template = MessageTemplate.objects.get(id=pk)
            # Ensure the template is either a platform default or belongs to this shop
            if template.shop_id is not None and template.shop_id != shop.id:
                raise NotFound("Message template not found.")
        except MessageTemplate.DoesNotExist as err:
            raise NotFound("Message template not found.") from err

        serializer = self.get_serializer(template)
        return Response(serializer.data)

    def partial_update(self, request, pk=None, *args, **kwargs):
        self._check_settings_perm()
        shop = request.shop
        try:
            template = MessageTemplate.objects.get(id=pk)
            if template.shop_id is not None and template.shop_id != shop.id:
                raise NotFound("Message template not found.")
        except MessageTemplate.DoesNotExist as err:
            raise NotFound("Message template not found.") from err

        # Disallow editing SMS templates
        if template.channel == TemplateChannelChoices.SMS:
            raise ValidationError(
                {"channel": "SMS template bodies cannot be edited directly due to TRAI DLT regulations."}
            )

        serializer = self.get_serializer(template, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        new_body = serializer.validated_data.get("body", template.body)
        new_active = serializer.validated_data.get("is_active", template.is_active)
        new_wa_name = serializer.validated_data.get("wa_template_name", template.wa_template_name)

        if template.shop_id is None:
            # Overriding platform default: create or update a shop-specific template
            override, created = MessageTemplate.objects.update_or_create(
                shop=shop,
                key=template.key,
                channel=template.channel,
                locale=template.locale,
                defaults={
                    "body": new_body,
                    "is_active": new_active,
                    "wa_template_name": new_wa_name,
                },
            )
            target = override
        else:
            # Updating existing shop template
            template.body = new_body
            template.is_active = new_active
            template.wa_template_name = new_wa_name
            template.save()
            target = template

        record_audit(
            actor=request.user,
            shop=shop,
            request=request,
            action="shop.message_template_updated",
            entity=target,
            after={
                "template_id": str(target.id),
                "key": target.key,
                "channel": target.channel,
                "locale": target.locale,
            },
        )

        return Response(self.get_serializer(target).data, status=status.HTTP_200_OK)
