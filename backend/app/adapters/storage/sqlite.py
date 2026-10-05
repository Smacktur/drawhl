import sqlite3
import threading
import uuid
from contextlib import contextmanager
from pathlib import Path

from app.domain.boards import BoardDoc, BoardRecord, BoardSummary
from app.domain.errors import NotFound, VersionConflict
from app.domain.tasks import Task, now_iso

# File names start with the schema version they produce: 001_init.sql → user_version 1.
MIGRATIONS = sorted(
    (int(path.name.split("_", 1)[0]), path)
    for path in (Path(__file__).parent / "migrations").glob("*.sql")
)


class Database:
    """One shared connection guarded by a lock: enough for a single-user app."""

    def __init__(self, path: str) -> None:
        if path != ":memory:":
            Path(path).parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(path, check_same_thread=False, isolation_level=None)
        self._conn.row_factory = sqlite3.Row
        self._lock = threading.Lock()
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._migrate()

    def _migrate(self) -> None:
        current = self._conn.execute("PRAGMA user_version").fetchone()[0]
        for number, script in MIGRATIONS:
            if number <= current:
                continue
            # executescript commits any open transaction, so the script carries its own.
            with self._lock:
                self._conn.executescript(
                    f"BEGIN;\n{script.read_text()}\nPRAGMA user_version = {number};\nCOMMIT;"
                )

    @contextmanager
    def transaction(self):
        with self._lock:
            self._conn.execute("BEGIN")
            try:
                yield self._conn
            except BaseException:
                self._conn.execute("ROLLBACK")
                raise
            self._conn.execute("COMMIT")

    def ping(self) -> bool:
        try:
            with self._lock:
                return self._conn.execute("SELECT 1").fetchone()[0] == 1
        except sqlite3.Error:
            return False


class SqliteBoardRepo:
    def __init__(self, db: Database) -> None:
        self._db = db

    def list(self) -> list[BoardSummary]:
        with self._db.transaction() as conn:
            rows = conn.execute(
                "SELECT id, name, updated_at FROM boards ORDER BY updated_at DESC"
            ).fetchall()
        return [BoardSummary(**dict(row)) for row in rows]

    def create(self, name: str, doc: BoardDoc) -> BoardSummary:
        board_id, now = uuid.uuid4().hex, now_iso()
        with self._db.transaction() as conn:
            conn.execute(
                "INSERT INTO boards (id, name, doc, version, created_at, updated_at)"
                " VALUES (?, ?, ?, 1, ?, ?)",
                (board_id, name, doc.model_dump_json(exclude_none=True), now, now),
            )
        return BoardSummary(id=board_id, name=name, updated_at=now)

    def get(self, board_id: str) -> BoardRecord | None:
        with self._db.transaction() as conn:
            row = conn.execute(
                "SELECT id, name, doc, version, updated_at FROM boards WHERE id = ?", (board_id,)
            ).fetchone()
        if row is None:
            return None
        return BoardRecord(
            id=row["id"],
            name=row["name"],
            version=row["version"],
            updated_at=row["updated_at"],
            doc=BoardDoc.model_validate_json(row["doc"]),
        )

    def save(self, board_id: str, version: int, doc: BoardDoc) -> int:
        with self._db.transaction() as conn:
            cursor = conn.execute(
                "UPDATE boards SET doc = ?, version = version + 1, updated_at = ?"
                " WHERE id = ? AND version = ?",
                (doc.model_dump_json(exclude_none=True), now_iso(), board_id, version),
            )
            if cursor.rowcount == 0:
                exists = conn.execute("SELECT 1 FROM boards WHERE id = ?", (board_id,)).fetchone()
                if exists is None:
                    raise NotFound("board not found")
                raise VersionConflict("board was changed elsewhere; reload it")
        return version + 1


class SqliteSnapshotRepo:
    def __init__(self, db: Database) -> None:
        self._db = db

    def get_many(self, keys: list[str]) -> dict[str, Task]:
        if not keys:
            return {}
        marks = ",".join("?" * len(keys))
        with self._db.transaction() as conn:
            rows = conn.execute(
                f"SELECT data FROM task_snapshots WHERE key IN ({marks})", keys
            ).fetchall()
        tasks = [Task.model_validate_json(row["data"]) for row in rows]
        return {task.key: task for task in tasks}

    def put_many(self, tasks: list[Task]) -> None:
        with self._db.transaction() as conn:
            conn.executemany(
                "INSERT INTO task_snapshots (key, state, data, fetched_at) VALUES (?, ?, ?, ?)"
                " ON CONFLICT(key) DO UPDATE SET state = excluded.state, data = excluded.data,"
                " fetched_at = excluded.fetched_at",
                [(t.key, t.state, t.model_dump_json(), t.fetched_at) for t in tasks],
            )
