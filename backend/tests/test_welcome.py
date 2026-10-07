import sqlite3
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, date, datetime

from app.adapters.storage.sqlite import Database, SqliteBoardRepo
from app.adapters.tasks.demo import DemoTaskProvider
from app.domain.boards import BoardDoc, check_doc, list_boards, task_keys
from app.domain.welcome import WELCOME_NAME, welcome_doc

NOW = datetime(2026, 10, 7, 9, 30, tzinfo=UTC)


def test_welcome_doc_is_a_valid_board_with_every_kind():
    doc = BoardDoc.model_validate(welcome_doc(NOW))
    check_doc(doc)
    kinds = {node.type for node in doc.nodes}
    assert kinds == {"text", "frame", "sticky", "jira_card", "timer", "module"}
    assert len(doc.edges) == 2
    assert any(n.type == "jira_card" and n.data.collapsed for n in doc.nodes)


def test_welcome_doc_uses_only_demo_tasks():
    doc = BoardDoc.model_validate(welcome_doc(NOW))
    demo = DemoTaskProvider()
    for key in task_keys(doc):
        assert demo.resolve(key).key == key


def test_welcome_dates_follow_the_day_it_is_made():
    doc = BoardDoc.model_validate(welcome_doc(NOW))
    gantt = next(n for n in doc.nodes if n.type == "module").data.content
    assert date.fromisoformat(gantt["start"]) < NOW.date() < date.fromisoformat(gantt["end"])
    assert gantt["milestones"][0]["date"] > NOW.date().isoformat()
    timer = next(n for n in doc.nodes if n.type == "timer")
    assert timer.data.dueAt > NOW


def test_first_read_of_an_empty_store_creates_the_welcome_board_once():
    repo = SqliteBoardRepo(Database(":memory:"))
    [board] = list_boards(repo, NOW)
    assert board.name == WELCOME_NAME
    assert [b.id for b in list_boards(repo, NOW)] == [board.id]


def test_deleting_every_board_does_not_bring_it_back():
    repo = SqliteBoardRepo(Database(":memory:"))
    [board] = list_boards(repo, NOW)
    repo.delete(board.id)
    assert list_boards(repo, NOW) == []


def test_a_store_that_already_has_boards_is_never_seeded():
    repo = SqliteBoardRepo(Database(":memory:"))
    mine = repo.create("Q4", BoardDoc())
    repo.delete(mine.id)
    assert repo.create_first(WELCOME_NAME, BoardDoc()) is None


def test_upgrade_marks_existing_installs_as_seeded(tmp_path):
    path = str(tmp_path / "app.db")
    # A database from before the welcome board: schema version 2 with one board.
    old = sqlite3.connect(path)
    old.executescript(
        "CREATE TABLE boards (id TEXT PRIMARY KEY, name TEXT, doc TEXT, version INTEGER,"
        " created_at TEXT, updated_at TEXT);"
        "CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);"
        "INSERT INTO boards VALUES ('b', 'Q4', '{}', 1, 'x', 'x');"
        "PRAGMA user_version = 2;"
    )
    old.close()
    repo = SqliteBoardRepo(Database(path))
    repo.delete("b")
    assert list_boards(repo, NOW) == []


def test_concurrent_first_reads_create_one_board():
    repo = SqliteBoardRepo(Database(":memory:"))
    with ThreadPoolExecutor(8) as pool:
        list(pool.map(lambda _: list_boards(repo, NOW), range(8)))
    assert len(repo.list()) == 1
