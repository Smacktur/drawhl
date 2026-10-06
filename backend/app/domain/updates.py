import threading
import time
from collections.abc import Callable

from pydantic import BaseModel

from app.domain.errors import DependencyUnavailable
from app.domain.ports import ReleaseFeed

CHECK_EVERY_S = 6 * 3600
# A failed check (offline, GitHub blocked) is retried sooner, but not on every page load.
RETRY_FAILED_S = 3600


class Release(BaseModel):
    version: str
    url: str


class VersionView(BaseModel):
    version: str
    latest: Release | None
    update_available: bool


def _calver(version: str) -> tuple[int, ...] | None:
    try:
        return tuple(int(part) for part in version.removeprefix("v").split("."))
    except ValueError:
        return None


def is_newer(candidate: str, current: str) -> bool:
    new, old = _calver(candidate), _calver(current)
    return new is not None and old is not None and new > old


class UpdateService:
    """The running version and, when checks are on, the newest published release."""

    def __init__(
        self,
        current: str,
        feed: ReleaseFeed | None,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._current = current
        self._feed = feed
        self._clock = clock
        self._latest: Release | None = None
        self._next_check = 0.0
        self._lock = threading.Lock()

    def view(self) -> VersionView:
        latest = self._latest_release()
        return VersionView(
            version=self._current,
            latest=latest,
            update_available=latest is not None and is_newer(latest.version, self._current),
        )

    def _latest_release(self) -> Release | None:
        if self._feed is None:
            return None
        with self._lock:
            now = self._clock()
            if now >= self._next_check:
                try:
                    self._latest = self._feed.latest()
                    self._next_check = now + CHECK_EVERY_S
                except DependencyUnavailable:
                    self._next_check = now + RETRY_FAILED_S
            return self._latest
