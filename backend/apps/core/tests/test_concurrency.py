import pytest
from rest_framework.test import APIRequestFactory

from apps.core.api.concurrency import expected_version
from apps.core.api.errors import DomainError


@pytest.mark.parametrize(("header", "value"), [("3", 3), ('"3"', 3), ('W/"7"', 7)])
def test_if_match_parsing(header, value):
    request = APIRequestFactory().patch("/", HTTP_IF_MATCH=header)
    assert expected_version(request) == value


def test_if_match_required():
    with pytest.raises(DomainError) as exc:
        expected_version(APIRequestFactory().patch("/"))
    assert exc.value.status_code == 428


def test_if_match_invalid():
    with pytest.raises(DomainError) as exc:
        expected_version(APIRequestFactory().patch("/", HTTP_IF_MATCH="invalid-version"))
    assert exc.value.status_code == 400
    assert exc.value.error_code == "concurrency.if_match_invalid"
