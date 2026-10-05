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
    board = repo.create("Q4", BoardDoc())
    assert repo.save(board.id, 1, BoardDoc()) == 2
    with pytest.raises(VersionConflict):
        repo.save(board.id, 1, BoardDoc())
    assert repo.get(board.id).version == 2
    assert [b.name for b in repo.list()] == ["Q4"]


def test_snapshots_upsert_by_key(db):
    repo = SqliteSnapshotRepo(db)
    provider = DemoTaskProvider()
    repo.put_many([provider.resolve("DEMO-1")])
    repo.put_many([provider.resolve("DEMO-1"), provider.resolve("DEMO-2")])
    assert set(repo.get_many(["DEMO-1", "DEMO-2", "DEMO-3"])) == {"DEMO-1", "DEMO-2"}
    assert repo.get_many([]) == {}


def test_migrations_run_once(tmp_path):
    path = str(tmp_path / "app.db")
    SqliteBoardRepo(Database(path)).create("kept", BoardDoc())
    assert [b.name for b in SqliteBoardRepo(Database(path)).list()] == ["kept"]
