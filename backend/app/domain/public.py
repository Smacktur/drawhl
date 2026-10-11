import math
import secrets
import threading
import time
from collections.abc import Callable
from typing import Any

from pydantic import BaseModel

from app.domain.boards import task_refs
from app.domain.errors import DomainError, Forbidden, NotFound, TooManyAttempts
from app.domain.ports import BoardRepo, LiveBoards, TaskProvider
from app.domain.tasks import Task, now_iso, split_ref, task_ref

# Guests of one link share this budget, so one link going viral cannot starve the instance.
# The API sits behind proxies and cannot tell guests apart by address.
LINK_REQUESTS = 3000
LINK_WINDOW_S = 60.0
_KEEP_WINDOWS = 1024


class PublicBoard(BaseModel):
    """A board as a guest gets it: content and tasks, nothing about its people."""

    name: str
    updated_at: str
    version: int
    doc: dict[str, Any]
    tasks: dict[str, Task]
    default_source: str
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
            if key not in self._windows and len(self._windows) >= _KEEP_WINDOWS:
                # Links that were deleted or went quiet would otherwise stay here for good.
                self._windows = {
                    k: w for k, w in self._windows.items() if now - w[0] < self._window_s
                }
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
        live: LiveBoards | None = None,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._boards = boards
        self._allowed = allowed
        self._live = live
        self._budget = _Budget(LINK_REQUESTS, LINK_WINDOW_S, clock)

    def token(self, board_id: str) -> str | None:
        return self._boards.public_token(board_id)

    def set(self, board_id: str, public: bool) -> str | None:
        """Turns the link on or off. A link turned off is gone: turning it on makes a new one."""
        if not public:
            if old := self._boards.clear_public_token(board_id):
                self._budget.drop(old)
                if self._live:
                    self._live.end_public(board_id)
            return None
        if not self._allowed():
            raise Forbidden("Public links are switched off on this tiko.")
        token = self._boards.ensure_public_token(board_id, secrets.token_urlsafe(24))
        if token is None:
            raise NotFound("board not found")
        return token

    def find(self, token: str) -> tuple[str, int, str]:
        """The id, version and last change time of the board behind a link. A wrong link, a
        link turned off and an instance without public links all answer like a missing board."""
        found = self._boards.by_public_token(token) if self._allowed() else None
        if found is None:
            raise NotFound("board not found")
        self._budget.spend(token)
        return found

    def alive(self, token: str, board_id: str) -> bool:
        """Whether the link still opens this board; asked for an open socket, outside the budget."""
        found = self._boards.by_public_token(token) if self._allowed() else None
        return found is not None and found[0] == board_id


def guest_tasks(
    refs: list[str], open_sources: dict[str, TaskProvider], base_url: str | None
) -> dict[str, Task]:
    """What a guest gets, by ref. Tasks of the open sources (the demo, public GitHub) belong
    to no person and show in full; a task read with a person's token, or one an open source
    cannot read right now, is its key and its link, nothing else."""
    url = f"{base_url}/browse/" if base_url else ""
    keys: dict[str, list[str]] = {}
    for ref in refs:
        source, key = split_ref(ref)
        keys.setdefault(source, []).append(key)
    tasks: dict[str, Task] = {}
    for source, source_keys in keys.items():
        provider = open_sources.get(source)
        try:
            found = provider.poll(source_keys) if provider else []
        except DomainError:
            found = []
        tasks |= {task.ref: task for task in found if task.state == "ok"}
        for key in source_keys:
            ref = task_ref(source, key)
            if ref not in tasks:
                link = f"{url}{key}" if url and provider is None else ""
                tasks[ref] = Task(
                    source=source, key=key, state="private", url=link, fetched_at=now_iso()
                )
    return tasks


def public_board(
    board_id: str,
    boards: BoardRepo,
    open_sources: dict[str, TaskProvider],
    default_source: str,
    base_url: str | None,
    refresh_interval_s: int,
) -> PublicBoard:
    record = boards.get(board_id)
    if record is None:
        raise NotFound("board not found")
    return PublicBoard(
        name=record.name,
        updated_at=record.updated_at,
        version=record.version,
        doc=record.doc.model_dump(exclude_none=True),
        tasks=guest_tasks(task_refs(record.doc, default_source), open_sources, base_url),
        default_source=default_source,
        refresh_interval_s=refresh_interval_s,
    )
