import pytest

from app.adapters.tasks.demo import DemoTaskProvider
from app.domain.errors import TaskNotFound


def test_resolve_known_task():
    task = DemoTaskProvider().resolve("DEMO-3")
    assert task.status_category == "done"
    assert task.url == "https://jira.example.com/browse/DEMO-3"


def test_unknown_task():
    provider = DemoTaskProvider()
    with pytest.raises(TaskNotFound):
        provider.resolve("NOPE-1")
    assert [t.state for t in provider.poll(["DEMO-1", "NOPE-1"])] == ["ok", "not_found"]
