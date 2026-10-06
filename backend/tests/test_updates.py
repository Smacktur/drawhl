import httpx
import pytest
from fastapi.testclient import TestClient

from app.adapters.releases.github import GitHubReleaseFeed
from app.config import Settings
from app.domain.errors import DependencyUnavailable
from app.domain.updates import CHECK_EVERY_S, RETRY_FAILED_S, Release, UpdateService, is_newer
from app.main import create_app
from app.version import VERSION


class Feed:
    def __init__(self, *answers: Release | Exception) -> None:
        self.answers = list(answers)
        self.calls = 0

    def latest(self) -> Release:
        self.calls += 1
        answer = self.answers.pop(0)
        if isinstance(answer, Exception):
            raise answer
        return answer


class Clock:
    now = 1000.0

    def __call__(self) -> float:
        return self.now


def release(version: str) -> Release:
    return Release(version=version, url=f"https://github.com/o/r/releases/tag/v{version}")


def test_calver_compares_numerically():
    assert is_newer("2026.10.10", "2026.10.9")
    assert is_newer("2027.1.1", "2026.12.31")
    assert not is_newer("2026.10.6", "2026.10.6")
    assert not is_newer("2026.10.5", "2026.10.6")
    assert not is_newer("2026.10.7", "dev")


def test_reports_a_newer_release_and_caches_it():
    clock = Clock()
    feed = Feed(release("2026.11.1"), release("2026.12.1"))
    service = UpdateService("2026.10.6", feed, clock)
    view = service.view()
    assert (view.version, view.latest.version, view.update_available) == (
        "2026.10.6",
        "2026.11.1",
        True,
    )
    service.view()
    assert feed.calls == 1
    clock.now += CHECK_EVERY_S
    assert service.view().latest.version == "2026.12.1"


def test_same_version_is_not_an_update():
    assert not UpdateService("2026.10.6", Feed(release("2026.10.6"))).view().update_available


def test_failed_check_is_quiet_and_retried_later():
    clock = Clock()
    feed = Feed(DependencyUnavailable("offline"), release("2026.11.1"))
    service = UpdateService("2026.10.6", feed, clock)
    assert service.view().latest is None
    service.view()
    assert feed.calls == 1
    clock.now += RETRY_FAILED_S
    assert service.view().update_available


def test_checks_off_never_call_out():
    view = UpdateService("2026.10.6", None).view()
    assert (view.latest, view.update_available) == (None, False)


def test_github_feed_parses_the_latest_release():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/repos/o/r/releases/latest"
        return httpx.Response(
            200, json={"tag_name": "v2026.11.1", "html_url": "https://github.com/o/r/rel"}
        )

    feed = GitHubReleaseFeed("o/r", httpx.Client(transport=httpx.MockTransport(handler)))
    assert feed.latest() == Release(version="2026.11.1", url="https://github.com/o/r/rel")


def test_github_feed_errors_become_unavailable():
    feed = GitHubReleaseFeed(
        "o/r", httpx.Client(transport=httpx.MockTransport(lambda _: httpx.Response(404)))
    )
    with pytest.raises(DependencyUnavailable):
        feed.latest()


def test_version_endpoint():
    app = create_app(Settings(db_path=":memory:"), release_feed=Feed(release("2999.1.1")))
    body = TestClient(app).get("/api/version").json()
    assert body["version"] == VERSION
    assert body["update_available"] is True
    assert body["latest"]["version"] == "2999.1.1"


def test_version_endpoint_with_checks_off():
    app = create_app(Settings(db_path=":memory:", update_check=False))
    body = TestClient(app).get("/api/version").json()
    assert body == {"version": VERSION, "latest": None, "update_available": False}
