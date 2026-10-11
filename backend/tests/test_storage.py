import sqlite3

import pytest

from app.adapters.storage.sqlite import Database, SqliteBoardRepo, SqliteSnapshotRepo
from app.adapters.tasks.demo import DemoTaskProvider
from app.domain.boards import BoardDoc
from app.domain.errors import VersionConflict


@pytest.fixture
def db():
    return Database(":memory:")


def test_board_save_is_compare_and_set(db):
    repo = SqliteBoardRepo(db)
    board_id = repo.create("Q4", BoardDoc(), "owner")
    assert repo.save(board_id, 1, BoardDoc()) == 2
    with pytest.raises(VersionConflict):
        repo.save(board_id, 1, BoardDoc())
    assert repo.get(board_id).version == 2
    assert [b.name for b in repo.listing("owner")] == ["Q4"]


def test_snapshots_upsert_by_key(db):
    repo = SqliteSnapshotRepo(db)
    provider = DemoTaskProvider()
    repo.put_many([provider.resolve("DEMO-1")])
    repo.put_many([provider.resolve("DEMO-1"), provider.resolve("DEMO-2")])
    refs = ["demo:DEMO-1", "demo:DEMO-2", "demo:DEMO-3"]
    assert set(repo.get_many(refs)) == {"demo:DEMO-1", "demo:DEMO-2"}
    assert repo.get_many([]) == {}


def test_snapshots_keep_trackers_and_people_apart(db):
    task = DemoTaskProvider().resolve("DEMO-1")
    other = task.model_copy(update={"source": "jira", "summary": "Another task"})
    ann = SqliteSnapshotRepo(db).scoped("ann")
    ann.put_many([task, other])
    found = ann.get_many(["demo:DEMO-1", "jira:DEMO-1"])
    assert found["demo:DEMO-1"].summary != found["jira:DEMO-1"].summary == "Another task"
    assert SqliteSnapshotRepo(db).scoped("bob").get_many(["demo:DEMO-1"]) == {}


def test_migrations_run_once(tmp_path):
    path = str(tmp_path / "app.db")
    SqliteBoardRepo(Database(path)).create("kept", BoardDoc(), "owner")
    assert [b.name for b in SqliteBoardRepo(Database(path)).listing("owner")] == ["kept"]


def test_upgrade_keeps_each_persons_task_cache(tmp_path):
    path = str(tmp_path / "app.db")
    Database(path)
    conn = sqlite3.connect(path)
    conn.executescript(
        "PRAGMA user_version = 10; DROP TABLE task_snapshots_v3;"
        "CREATE TABLE task_snapshots_v2 (user_id TEXT, key TEXT, state TEXT, data TEXT,"
        " fetched_at TEXT, PRIMARY KEY (user_id, key));"
        "INSERT INTO settings VALUES ('provider', 'jira');"
    )
    old = DemoTaskProvider().resolve("DEMO-1").model_dump_json(exclude={"source"})
    conn.executemany(
        "INSERT INTO task_snapshots_v2 VALUES (?, 'DEMO-1', 'ok', ?, 'x')",
        [("ann", old), ("", old)],
    )
    conn.commit()
    conn.close()

    ann = SqliteSnapshotRepo(Database(path)).scoped("ann")
    assert ann.get_many(["jira:DEMO-1"])["jira:DEMO-1"].source == "jira"
    assert SqliteSnapshotRepo(Database(path)).scoped("").get_many(["jira:DEMO-1"]) == {}
