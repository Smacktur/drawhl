import pytest

from app.adapters.storage.sqlite import Database, SqliteBoardRepo, SqliteSnapshotRepo
from app.adapters.tasks.demo import DemoTaskProvider
from app.domain.boards import BoardDoc
from app.domain.errors import JiraRateLimited, JiraUnauthorized, JiraUnavailable, NotFound
from app.domain.refresh import RefreshService

DOC = BoardDoc.model_validate(
    {
        "nodes": [
            {"id": "a", "type": "jira_card", "position": {"x": 0, "y": 0}, "data": {"key": k}}
            for k in ("DEMO-1", "DEMO-2")
        ]
    }
)


class Flaky:
    """Demo provider that fails with the queued errors before answering."""

    base_host = "jira.example.com"

    def __init__(self, *errors: Exception) -> None:
        self.errors = list(errors)
        self.calls = 0
        self.demo = DemoTaskProvider()

    def poll(self, keys):
        self.calls += 1
        if self.errors:
            raise self.errors.pop(0)
        return self.demo.poll(keys)


@pytest.fixture
def repos():
    db = Database(":memory:")
    boards = SqliteBoardRepo(db)
    board = boards.create("b", BoardDoc())
    boards.save(board.id, 1, DOC)
    return board.id, boards, SqliteSnapshotRepo(db)


class Clock:
    def __init__(self) -> None:
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now


def test_one_poll_stores_snapshots(repos):
    board_id, boards, snapshots = repos
    provider = Flaky()
    tasks = RefreshService().refresh(board_id, 30, boards, snapshots, provider)
    assert set(tasks) == {"DEMO-1", "DEMO-2"}
    assert provider.calls == 1
    assert set(snapshots.get_many(["DEMO-1", "DEMO-2"])) == {"DEMO-1", "DEMO-2"}


def test_backoff_doubles_and_resets(repos):
    board_id, boards, snapshots = repos
    clock = Clock()
    service = RefreshService(clock)
    provider = Flaky(JiraUnavailable("down"), JiraUnavailable("down"))

    with pytest.raises(JiraUnavailable):
        service.refresh(board_id, 30, boards, snapshots, provider)
    clock.now += 59
    with pytest.raises(JiraRateLimited) as waiting:
        service.refresh(board_id, 30, boards, snapshots, provider)
    assert waiting.value.retry_after == 1
    assert provider.calls == 1

    clock.now += 1
    with pytest.raises(JiraUnavailable):
        service.refresh(board_id, 30, boards, snapshots, provider)
    clock.now += 119
    with pytest.raises(JiraRateLimited):
        service.refresh(board_id, 30, boards, snapshots, provider)

    clock.now += 1
    assert service.refresh(board_id, 30, boards, snapshots, provider)
    assert service.refresh(board_id, 30, boards, snapshots, provider)


def test_retry_after_and_cap(repos):
    board_id, boards, snapshots = repos
    clock = Clock()
    service = RefreshService(clock)
    provider = Flaky(JiraRateLimited("slow down", 500))
    with pytest.raises(JiraRateLimited):
        service.refresh(board_id, 30, boards, snapshots, provider)
    clock.now += 299
    with pytest.raises(JiraRateLimited):
        service.refresh(board_id, 30, boards, snapshots, provider)
    clock.now += 1
    assert service.refresh(board_id, 30, boards, snapshots, provider)


def test_auth_errors_do_not_back_off(repos):
    board_id, boards, snapshots = repos
    provider = Flaky(JiraUnauthorized("401"))
    service = RefreshService(Clock())
    with pytest.raises(JiraUnauthorized):
        service.refresh(board_id, 30, boards, snapshots, provider)
    assert service.refresh(board_id, 30, boards, snapshots, provider)


def test_failed_refresh_keeps_last_snapshot(repos):
    board_id, boards, snapshots = repos
    service = RefreshService(Clock())
    service.refresh(board_id, 30, boards, snapshots, Flaky())
    with pytest.raises(JiraUnavailable):
        service.refresh(board_id, 30, boards, snapshots, Flaky(JiraUnavailable("down")))
    assert set(snapshots.get_many(["DEMO-1"])) == {"DEMO-1"}


def test_missing_board(repos):
    _, boards, snapshots = repos
    with pytest.raises(NotFound):
        RefreshService().refresh("nope", 30, boards, snapshots, Flaky())
