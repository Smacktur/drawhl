import math
import threading
import time
from collections.abc import Callable
from dataclasses import dataclass
from typing import Literal

from pydantic import BaseModel

from app.domain.boards import card_keys
from app.domain.errors import (
    DomainError,
    JiraRateLimited,
    JiraUnavailable,
    JiraUnreachable,
    NotFound,
)
from app.domain.ports import BoardRepo, SnapshotRepo, TaskProvider
from app.domain.tasks import Task, now_iso

MAX_BACKOFF_S = 300


class SourceError(BaseModel):
    code: str
    message: str
    retry_after: int | None = None


class SourceStatus(BaseModel):
    """How the last poll of one tracker went."""

    id: str
    name: str
    state: Literal["ok", "error"]
    synced_at: str | None
    error: SourceError | None = None


@dataclass
class _Source:
    fails: int = 0
    backoff_until: float = 0.0
    synced_at: str | None = None
    error: SourceError | None = None


class RefreshService:
    """One batched poll per tracker per call; backoff is per tracker and shared by all boards."""

    def __init__(self, clock: Callable[[], float] = time.monotonic) -> None:
        self._clock = clock
        self._sources: dict[str, _Source] = {}
        # Sync routes run on a threadpool; two tabs must not both pass the backoff check.
        self._lock = threading.Lock()

    def reset(self) -> None:
        """Called when settings change: a fixed URL or token deserves an immediate try."""
        with self._lock:
            for source in self._sources.values():
                source.fails = 0
                source.backoff_until = 0.0

    def refresh(
        self,
        board_id: str,
        interval_s: int,
        boards: BoardRepo,
        snapshots: SnapshotRepo,
        provider: TaskProvider,
    ) -> tuple[dict[str, Task], list[SourceStatus]]:
        record = boards.get(board_id)
        if record is None:
            raise NotFound("board not found")
        keys = card_keys(record.doc)
        with self._lock:
            source = self._sources.setdefault(provider.source_id, _Source())
            tasks = self._poll(source, keys, interval_s, provider) if keys else []
            status = SourceStatus(
                id=provider.source_id,
                name=provider.source_name,
                state="error" if source.error else "ok",
                synced_at=source.synced_at,
                error=source.error,
            )
        snapshots.put_many(tasks)
        return {task.key: task for task in tasks}, [status]

    def _poll(
        self, source: _Source, keys: list[str], interval_s: int, provider: TaskProvider
    ) -> list[Task]:
        now = self._clock()
        if now < source.backoff_until:
            if source.error:
                source.error.retry_after = math.ceil(source.backoff_until - now)
            return []
        try:
            tasks = provider.poll(keys)
        except DomainError as exc:
            source.error = SourceError(code=exc.code, message=exc.message)
            # Only an overloaded tracker is spared; auth, config and network errors retry at
            # the normal pace, so a fixed token or a VPN coming back shows up on the next tick.
            if isinstance(exc, JiraUnavailable | JiraRateLimited) and not isinstance(
                exc, JiraUnreachable
            ):
                source.fails += 1
                retry_after = exc.retry_after if isinstance(exc, JiraRateLimited) else 0
                wait = min(MAX_BACKOFF_S, max(retry_after, interval_s * 2**source.fails))
                source.backoff_until = now + wait
                source.error.retry_after = wait
            return []
        source.fails = 0
        source.error = None
        source.synced_at = now_iso()
        return tasks
