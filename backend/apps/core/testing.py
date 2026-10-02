"""Test helpers shared by every app."""


def assert_other_shop_hidden(client, url: str, methods: tuple[str, ...] = ("get", "patch", "delete")) -> None:
    """An object of another shop must look exactly like a missing object: 404 for every method."""
    for method in methods:
        call = getattr(client, method)
        response = call(url) if method in ("get", "delete") else call(url, {}, format="json", HTTP_IF_MATCH="1")
        assert response.status_code == 404, f"{method.upper()} {url} returned {response.status_code}, expected 404"
