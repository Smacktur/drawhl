from __future__ import annotations

import hashlib
import secrets
import threading
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from app.domain.ports import SessionRepo

if TYPE_CHECKING:
    from app.domain.accounts import Person

SESSION_TTL_S = 30 * 24 * 3600
# Bounds how long a revoked session or a disabled person still gets through on another worker.
CACHE_S = 30.0


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def iso(ts: float) -> str:
    return datetime.fromtimestamp(ts, UTC).isoformat(timespec="seconds")


def _ts(iso: str) -> float:
    return datetime.fromisoformat(iso).timestamp()


class Sessions:
    """Random cookie tokens; only their hashes are stored, so a leaked database signs no one in."""

    def __init__(self, repo: SessionRepo) -> None:
        self._repo = repo
        self._cache: dict[str, tuple[Person, float, float]] = {}
        self._lock = threading.Lock()

    def start(self, user_id: str, now: float) -> str:
        token = secrets.token_urlsafe(32)
        self._repo.delete_expired(iso(now))
        self._repo.add(token_hash(token), user_id, iso(now + SESSION_TTL_S), iso(now))
        return token

    def resolve(self, token: str, now: float) -> Person | None:
        key = token_hash(token)
        with self._lock:
            cached = self._cache.get(key)
        if cached and now - cached[2] < CACHE_S:
            person, expires, _ = cached
            return person if expires > now else None
        found = self._repo.get(key)
        if found is None or _ts(found[1]) <= now or found[0].disabled:
            with self._lock:
                self._cache.pop(key, None)
            return None
        with self._lock:
            self._cache[key] = (found[0], _ts(found[1]), now)
        return found[0]

    def end(self, token: str) -> None:
        key = token_hash(token)
        self._repo.delete(key)
        with self._lock:
            self._cache.pop(key, None)

    def end_all(self, user_id: str, keep_token: str | None = None) -> None:
        self._repo.delete_for_user(user_id, token_hash(keep_token) if keep_token else None)
        self.forget(user_id)

    def forget(self, user_id: str) -> None:
        """Drops cached sessions of this person so the next request reads them fresh."""
        with self._lock:
            for key in [k for k, v in self._cache.items() if v[0].id == user_id]:
                del self._cache[key]
