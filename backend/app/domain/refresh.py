import math
import threading
import time
from collections.abc import Callable

from app.domain.boards import card_keys
from app.domain.errors import DependencyUnavailable, JiraRateLimited, NotFound
from app.domain.ports import BoardRepo, SnapshotRepo, TaskProvider
from app.domain.tasks import Task

MAX_BACKOFF_S = 300


class RefreshService:
    """One batched poll per call, with backoff shared by all boards because Jira is shared."""

    def __init__(self, clock: Callable[[], float] = time.monotonic) -> None:
        self._clock = clock
        self._fails = 0
        self._backoff_until = 0.0
        # Sync routes run on a threadpool; two tabs must not both pass the backoff check.
        self._lock = threading.Lock()

    def reset(self) -> None:
        """Called when settings change: a fixed URL or token deserves an immediate try."""
        with self._lock:
            self._fails = 0
            self._backoff_until = 0.0

    def refresh(
        self,
        board_id: str,
        interval_s: int,
        boards: BoardRepo,
        snapshots: SnapshotRepo,
        provider: TaskProvider,
    ) -> dict[str, Task]:
        record = boards.get(board_id)
        if record is None:
            raise NotFound("board not found")
        keys = card_keys(record.doc)
        if not keys:
            return {}
        with self._lock:
            now = self._clock()
            if now < self._backoff_until:
                wait = math.ceil(self._backoff_until - now)
                raise JiraRateLimited(f"Jira had trouble; next try in {wait}s", wait)
            try:
                tasks = provider.poll(keys)
            except (JiraRateLimited, DependencyUnavailable) as exc:
                # Auth and config errors are not slowed down: the user has to act on them.
                self._fails += 1
                retry_after = exc.retry_after if isinstance(exc, JiraRateLimited) else 0
                wait = min(MAX_BACKOFF_S, max(retry_after, interval_s * 2**self._fails))
                self._backoff_until = now + wait
                raise
            self._fails = 0
        snapshots.put_many(tasks)
        return {task.key: task for task in tasks}
