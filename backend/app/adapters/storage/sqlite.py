import sqlite3
import threading
import uuid
from contextlib import contextmanager
from pathlib import Path

from app.domain.accounts import Person
from app.domain.boards import BoardDoc, BoardRecord, BoardSummary
from app.domain.errors import NotFound, UsernameTaken, VersionConflict
from app.domain.tasks import Task, now_iso

# File names start with the schema version they produce: 001_init.sql → user_version 1.
MIGRATIONS = sorted(
    (int(path.name.split("_", 1)[0]), path)
    for path in (Path(__file__).parent / "migrations").glob("*.sql")
)

# Set by the first board ever created, so deleting every board does not bring the welcome back.
_SEEDED = "welcome_seeded"


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
        with self._db.transaction() as conn:
            return self._insert(conn, name, doc)

    def create_first(self, name: str, doc: BoardDoc) -> BoardSummary | None:
        with self._db.transaction() as conn:
            if conn.execute("SELECT 1 FROM settings WHERE key = ?", (_SEEDED,)).fetchone():
                return None
            return self._insert(conn, name, doc)

    @staticmethod
    def _insert(conn: sqlite3.Connection, name: str, doc: BoardDoc) -> BoardSummary:
        board_id, now = uuid.uuid4().hex, now_iso()
        conn.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, '1')", (_SEEDED,))
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

    def rename(self, board_id: str, name: str) -> BoardSummary:
        now = now_iso()
        with self._db.transaction() as conn:
            cursor = conn.execute(
                "UPDATE boards SET name = ?, updated_at = ? WHERE id = ?", (name, now, board_id)
            )
        if cursor.rowcount == 0:
            raise NotFound("board not found")
        return BoardSummary(id=board_id, name=name, updated_at=now)

    def delete(self, board_id: str) -> None:
        with self._db.transaction() as conn:
            cursor = conn.execute("DELETE FROM boards WHERE id = ?", (board_id,))
        if cursor.rowcount == 0:
            raise NotFound("board not found")


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


class SqliteSettingsRepo:
    def __init__(self, db: Database) -> None:
        self._db = db

    def get_all(self) -> dict[str, str]:
        with self._db.transaction() as conn:
            rows = conn.execute("SELECT key, value FROM settings").fetchall()
        return {row["key"]: row["value"] for row in rows}

    def set_many(self, values: dict[str, str | None]) -> None:
        with self._db.transaction() as conn:
            for key, value in values.items():
                if value is None:
                    conn.execute("DELETE FROM settings WHERE key = ?", (key,))
                else:
                    conn.execute(
                        "INSERT INTO settings (key, value) VALUES (?, ?)"
                        " ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                        (key, value),
                    )


_PERSON = "u.id, u.username, u.name, u.role, u.disabled_at"


def _person(row: sqlite3.Row) -> Person:
    return Person(
        id=row["id"],
        username=row["username"],
        name=row["name"],
        role=row["role"],
        disabled=row["disabled_at"] is not None,
    )


class SqliteUserRepo:
    def __init__(self, db: Database) -> None:
        self._db = db

    def count(self) -> int:
        with self._db.transaction() as conn:
            return conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]

    def add(self, person: Person, password_hash: str) -> None:
        try:
            with self._db.transaction() as conn:
                conn.execute(
                    "INSERT INTO users (id, username, name, password_hash, role, created_at)"
                    " VALUES (?, ?, ?, ?, ?, ?)",
                    (
                        person.id,
                        person.username,
                        person.name,
                        password_hash,
                        person.role,
                        now_iso(),
                    ),
                )
        except sqlite3.IntegrityError as error:
            raise UsernameTaken("This username is taken.") from error

    def find(self, username: str) -> tuple[Person, str] | None:
        with self._db.transaction() as conn:
            row = conn.execute(
                f"SELECT {_PERSON}, u.password_hash FROM users u"
                " WHERE lower(u.username) = lower(?)",
                (username,),
            ).fetchone()
        return (_person(row), row["password_hash"]) if row else None

    def update(self, person: Person) -> None:
        try:
            with self._db.transaction() as conn:
                conn.execute(
                    "UPDATE users SET name = ?, username = ? WHERE id = ?",
                    (person.name, person.username, person.id),
                )
        except sqlite3.IntegrityError as error:
            raise UsernameTaken("This username is taken.") from error

    def set_password(self, user_id: str, password_hash: str) -> None:
        with self._db.transaction() as conn:
            conn.execute(
                "UPDATE users SET password_hash = ? WHERE id = ?", (password_hash, user_id)
            )

    def touch_sign_in(self, user_id: str) -> None:
        with self._db.transaction() as conn:
            conn.execute("UPDATE users SET last_sign_in_at = ? WHERE id = ?", (now_iso(), user_id))


class SqliteSessionRepo:
    def __init__(self, db: Database) -> None:
        self._db = db

    def add(self, token_hash: str, user_id: str, expires_at: str, created_at: str) -> None:
        with self._db.transaction() as conn:
            conn.execute(
                "INSERT INTO sessions (token_hash, user_id, expires_at, created_at)"
                " VALUES (?, ?, ?, ?)",
                (token_hash, user_id, expires_at, created_at),
            )

    def get(self, token_hash: str) -> tuple[Person, str] | None:
        with self._db.transaction() as conn:
            row = conn.execute(
                f"SELECT {_PERSON}, s.expires_at FROM sessions s"
                " JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?",
                (token_hash,),
            ).fetchone()
        return (_person(row), row["expires_at"]) if row else None

    def delete(self, token_hash: str) -> None:
        with self._db.transaction() as conn:
            conn.execute("DELETE FROM sessions WHERE token_hash = ?", (token_hash,))

    def delete_for_user(self, user_id: str, keep: str | None) -> None:
        with self._db.transaction() as conn:
            conn.execute(
                "DELETE FROM sessions WHERE user_id = ? AND token_hash IS NOT ?", (user_id, keep)
            )

    def delete_expired(self, now: str) -> None:
        with self._db.transaction() as conn:
            conn.execute("DELETE FROM sessions WHERE expires_at <= ?", (now,))
