import hashlib
import hmac
import math
from collections import deque

from app.domain.errors import InvalidPassword, TooManyAttempts

SESSION_TTL_S = 30 * 24 * 3600
MAX_FAILURES = 5
FAILURE_WINDOW_S = 60.0


def _digest(value: str) -> bytes:
    return hashlib.sha256(value.encode()).digest()


class Access:
    """The instance password and the signed session tokens it gives out."""

    def __init__(self, password: str, secret_key: str = "") -> None:
        self._password = _digest(password)
        # Both values are in the key, so changing either one signs out every browser.
        self._key = _digest(f"drawhl-session\0{secret_key}\0{password}")
        # One counter per instance: a per-IP limit is dodged by forging X-Forwarded-For.
        self._failures: deque[float] = deque()

    def sign_in(self, password: str, now: float) -> str:
        while self._failures and self._failures[0] <= now - FAILURE_WINDOW_S:
            self._failures.popleft()
        if len(self._failures) >= MAX_FAILURES:
            wait = math.ceil(self._failures[0] + FAILURE_WINDOW_S - now)
            raise TooManyAttempts("too many wrong passwords, try again later", max(wait, 1))
        # Comparing digests keeps the time the same whatever the length of the guess.
        if not hmac.compare_digest(_digest(password), self._password):
            self._failures.append(now)
            raise InvalidPassword("wrong password")
        expires = str(int(now) + SESSION_TTL_S)
        return f"{expires}.{self._sign(expires)}"

    def is_valid(self, token: str, now: float) -> bool:
        expires, _, signature = token.partition(".")
        if not expires.isdigit():
            return False
        return hmac.compare_digest(signature, self._sign(expires)) and int(expires) > now

    def _sign(self, expires: str) -> str:
        return hmac.new(self._key, expires.encode(), hashlib.sha256).hexdigest()
