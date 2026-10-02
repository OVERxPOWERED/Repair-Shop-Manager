"""drf-spectacular hook: documents the {"data": ...} envelope the renderer adds."""


def wrap_responses_in_envelope(result, generator, request, public):
    for path_item in result.get("paths", {}).values():
        for operation in path_item.values():
            if not isinstance(operation, dict):
                continue
            for status_code, response in operation.get("responses", {}).items():
                if not str(status_code).startswith("2"):
                    continue
                content = response.get("content", {}).get("application/json")
                if not content or "schema" not in content:
                    continue
                schema = content["schema"]
                if {"data", "meta"} <= set(schema.get("properties", {})):
                    continue  # paginated: already enveloped
                content["schema"] = {"type": "object", "required": ["data"], "properties": {"data": schema}}
    return result
