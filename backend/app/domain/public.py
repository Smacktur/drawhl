import math
import secrets
import threading
import time
from collections.abc import Callable
from typing import Any

from pydantic import BaseModel

from app.domain.boards import task_keys
from app.domain.errors import Forbidden, NotFound, TooManyAttempts
from app.domain.ports import BoardRepo, SnapshotRepo
from app.domain.tasks import Task, now_iso

# Guests of one link share this budget, so one link going viral cannot starve the instance.
# The API sits behind proxies and cannot tell guests apart by address.
LINK_REQUESTS = 3000
LINK_WINDOW_S = 60.0


class PublicBoard(BaseModel):
    """A board as a guest gets it: content and tasks, nothing about its people."""

    name: str
    updated_at: str
    version: int
    doc: dict[str, Any]
    tasks: dict[str, Task]
    refresh_interval_s: int


class _Budget:
    """Requests per key in a fixed window."""

    def __init__(self, limit: int, window_s: float, clock: Callable[[], float]) -> None:
        self._limit = limit
        self._window_s = window_s
        self._clock = clock
        self._windows: dict[str, tuple[float, int]] = {}
        self._lock = threading.Lock()

    def spend(self, key: str) -> None:
        now = self._clock()
        with self._lock:
            started, used = self._windows.get(key, (now, 0))
            if now - started >= self._window_s:
                started, used = now, 0
            if used >= self._limit:
                wait = math.ceil(started + self._window_s - now)
                raise TooManyAttempts("This board is busy. Try again in a moment.", max(wait, 1))
            self._windows[key] = (started, used + 1)

    def drop(self, key: str) -> None:
        with self._lock:
            self._windows.pop(key, None)


class PublicLinks:
    """A board's public link: whoever has it can view that board without signing in."""

    def __init__(
        self,
        boards: BoardRepo,
        allowed: Callable[[], bool],
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._boards = boards
        self._allowed = allowed
        self._budget = _Budget(LINK_REQUESTS, LINK_WINDOW_S, clock)

    def token(self, board_id: str) -> str | None:
        return self._boards.public_token(board_id)

    def set(self, board_id: str, public: bool) -> str | None:
        """Turns the link on or off. A link turned off is gone: turning it on makes a new one."""
        current = self._boards.public_token(board_id)
        if not public:
            if current:
                self._boards.set_public_token(board_id, None)
                self._budget.drop(current)
            return None
        if not self._allowed():
            raise Forbidden("Public links are switched off on this tiko.")
        if current:
            return current
        token = secrets.token_urlsafe(24)
        self._boards.set_public_token(board_id, token)
        return token

    def find(self, token: str) -> tuple[str, int]:
        """The id and version of the board behind a link. A wrong link, a link turned off and
        an instance without public links all answer like a missing board."""
        found = self._boards.by_public_token(token) if self._allowed() else None
        if found is None:
            raise NotFound("board not found")
        self._budget.spend(token)
        return found


def private_tasks(keys: list[str], base_url: str | None) -> list[Task]:
    """What a guest gets for tasks that are read with a person's token: the key and its link."""
    url = f"{base_url}/browse/" if base_url else ""
    return [
        Task(key=key, state="private", url=f"{url}{key}" if url else "", fetched_at=now_iso())
        for key in keys
    ]


def public_board(
    board_id: str,
    boards: BoardRepo,
    shared: SnapshotRepo | None,
    base_url: str | None,
    refresh_interval_s: int,
) -> PublicBoard:
    """`shared` is the task cache that belongs to no person; None when tasks need a token."""
    record = boards.get(board_id)
    if record is None:
        raise NotFound("board not found")
    keys = task_keys(record.doc)
    if shared is None:
        tasks = {task.key: task for task in private_tasks(keys, base_url)}
    else:
        tasks = shared.get_many(keys)
    return PublicBoard(
        name=record.name,
        updated_at=record.updated_at,
        version=record.version,
        doc=record.doc.model_dump(exclude_none=True),
        tasks=tasks,
        refresh_interval_s=refresh_interval_s,
    )
