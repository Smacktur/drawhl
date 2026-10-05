import httpx
import pytest
from pydantic import SecretStr

from app.adapters.tasks.jira_dc import JiraDcProvider
from app.domain.errors import JiraRateLimited, JiraUnauthorized, JiraUnavailable, TaskNotFound
from app.domain.settings import JiraCredentials
from tests.jira_fake import TOKEN, FakeJira

BASE = "https://jira.example.com/jira"


def provider(fake: FakeJira, token: str = TOKEN) -> JiraDcProvider:
    creds = JiraCredentials(base_url=BASE, token=SecretStr(token))
    return JiraDcProvider(lambda: creds, httpx.Client(transport=httpx.MockTransport(fake)))


def test_resolve_maps_fields():
    fake = FakeJira()
    task = provider(fake).resolve("SRE-2")
    assert task.status_category == "done"
    assert task.assignee_name == "Alex Rivera"
    assert task.url == f"{BASE}/browse/SRE-2"
    assert fake.requests[0].url.path == "/jira/rest/api/2/issue/SRE-2"
    assert provider(fake).base_host == "jira.example.com"


def test_resolve_missing():
    with pytest.raises(TaskNotFound):
        provider(FakeJira()).resolve("SRE-9")


def test_check_and_bad_token():
    assert provider(FakeJira()).check() == "Alex Rivera"
    with pytest.raises(JiraUnauthorized):
        provider(FakeJira(), token="wrong").check()


def test_poll_marks_missing_keys():
    tasks = provider(FakeJira()).poll(["SRE-1", "SRE-9"])
    assert [(t.key, t.state) for t in tasks] == [("SRE-1", "ok"), ("SRE-9", "not_found")]


@pytest.mark.parametrize(
    ("status", "error"), [(429, JiraRateLimited), (502, JiraUnavailable), (403, JiraUnauthorized)]
)
def test_error_statuses(status, error):
    fake = FakeJira()
    fake.fail = status
    with pytest.raises(error) as info:
        provider(fake).resolve("SRE-1")
    if status == 429:
        assert info.value.retry_after == 42


def test_network_error():
    def boom(request):
        raise httpx.ConnectError("refused")

    creds = JiraCredentials(base_url=BASE, token=SecretStr(TOKEN))
    jira = JiraDcProvider(lambda: creds, httpx.Client(transport=httpx.MockTransport(boom)))
    with pytest.raises(JiraUnavailable):
        jira.check()
