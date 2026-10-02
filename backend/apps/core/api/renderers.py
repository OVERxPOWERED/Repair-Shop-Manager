from rest_framework.renderers import JSONRenderer


class Enveloped(dict):
    """Marker: this payload is already {"data": ..., "meta": ...} (used by pagination)."""


class EnvelopeJSONRenderer(JSONRenderer):
    """Wraps successful payloads in {"data": ...}. Errors are already shaped by the exception handler."""

    def render(self, data, accepted_media_type=None, renderer_context=None):
        response = (renderer_context or {}).get("response")
        if (
            response is not None
            and not response.exception
            and response.status_code != 204
            and data is not None
            and not isinstance(data, Enveloped)
        ):
            data = {"data": data}
        return super().render(data, accepted_media_type, renderer_context)
