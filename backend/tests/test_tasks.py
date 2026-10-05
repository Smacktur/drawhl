import pytest

from app.domain.errors import HostMismatch, InvalidRef
from app.domain.tasks import parse_ref

HOST = "jira.example.com"


@pytest.mark.parametrize(
    ("ref", "key"),
    [
        ("SRE-121", "SRE-121"),
        ("  sre-121 ", "SRE-121"),
        ("A_B2-7", "A_B2-7"),
        ("https://jira.example.com/browse/SRE-121", "SRE-121"),
        ("https://jira.example.com/jira/browse/sre-9/", "SRE-9"),
    ],
)
def test_parse_ref_accepts_keys_and_links(ref, key):
    assert parse_ref(ref, HOST) == key


@pytest.mark.parametrize("ref", ["", "SRE", "121", "SRE-", "1SRE-2", "https://jira.example.com/"])
def test_parse_ref_rejects_garbage(ref):
    with pytest.raises(InvalidRef):
        parse_ref(ref, HOST)


def test_parse_ref_rejects_other_host():
    with pytest.raises(HostMismatch):
        parse_ref("https://other.example.org/browse/SRE-1", HOST)
