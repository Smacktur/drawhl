import ipaddress
import secrets
import uuid

from app.domain.accounts import (
    Limiter,
    Person,
    check_name,
    check_password,
    check_username,
    hash_password,
)
from app.domain.errors import BoardLimit, DemoFull, NotFound
from app.domain.ports import BoardRepo, LiveBoards, UserRepo
from app.domain.sessions import Sessions, iso

VISITOR_TTL_S = 7 * 24 * 3600
# An account that changed nothing is what a bot leaves behind; it does not get the week.
UNTOUCHED_TTL_S = 3600
# Sign-up asks for no mail, so an account nobody comes back to is not kept for ever.
UNUSED_ACCOUNT_TTL_S = 90 * 24 * 3600
PER_ADDRESS = 5
PER_ADDRESS_WINDOW_S = 3600.0
MAX_ALIVE = 500
MAX_BOARDS = 3
CLEANUP_EVERY_S = 600
VISITOR_NAME = "Demo visitor"
# No password hashes to this, so a demo visitor cannot sign in by password.
NO_PASSWORD = "!"


def address_key(address: str) -> str:
    """What the address limit counts: an IPv4 address, or the /64 an IPv6 address is in,
    since one connection has all of its /64 to pick from."""
    try:
        ip = ipaddress.ip_address(address.strip())
    except ValueError:
        return address
    if ip.version == 6:
        return str(ipaddress.ip_network((ip, 64), strict=False))
    return str(ip)


def touch(users: UserRepo, user_id: str, now: float) -> str | None:
    """A demo visitor was here: their expiry moves on. Returns it, None for anyone else."""
    until = iso(now + VISITOR_TTL_S)
    return until if users.touch_demo(user_id, until) else None


def check_board_limit(person: Person, boards: BoardRepo) -> None:
    if person.role != "admin" and boards.owned(person.id) >= MAX_BOARDS:
        raise BoardLimit(f"A demo account holds {MAX_BOARDS} boards. Delete one to make another.")


class DemoVisitors:
    """Temporary people of a demo instance: made in one click, deleted when they stay away."""

    def __init__(self, users: UserRepo, sessions: Sessions, live: LiveBoards) -> None:
        self._users = users
        self._sessions = sessions
        self._live = live
        self._per_address = Limiter(
            PER_ADDRESS, PER_ADDRESS_WINDOW_S, "Too many demos from this address, try again later."
        )

    def create(self, address: str, now: float) -> str:
        """Makes a demo visitor and returns the token of their session."""
        key = address_key(address)
        self._per_address.check(key, now)
        if self._users.demo_alive(iso(now)) >= MAX_ALIVE:
            gone = self._users.evict_untouched_demo()
            if not gone[0]:
                raise DemoFull("The demo is full right now. Try again later.")
            self._forget(*gone)
        person = Person(
            id=uuid.uuid4().hex,
            # "~" is outside the username rule: nobody can pick this name or sign in with it.
            username=f"~{secrets.token_hex(6)}",
            name=VISITOR_NAME,
            role="member",
            demo_expires_at=iso(now + VISITOR_TTL_S),
        )
        self._users.add(person, NO_PASSWORD)
        self._per_address.fail(key, now)
        return self._sessions.start(person.id, now)

    def sign_up(self, person: Person, name: str, username: str, password: str) -> Person:
        """Makes a demo visitor a regular member: same person, same boards, same session."""
        changed = person.model_copy(
            update={
                "name": check_name(name),
                "username": check_username(username),
                "demo_expires_at": None,
            }
        )
        password_hash = hash_password(check_password(password))
        if not self._users.sign_up_demo(person.id, changed.username, changed.name, password_hash):
            raise NotFound("not found")
        # Open boards and the next request read the person again, now without the demo limits.
        self._sessions.forget(person.id)
        return changed

    def cleanup(self, now: float) -> int:
        """Deletes the demo visitors whose time is up and the accounts nobody signed in to for
        90 days; returns how many people went."""
        # The expiry is always a week after the last request, so one who changed nothing
        # and was last here an hour ago has this much of it left.
        untouched = iso(now + VISITOR_TTL_S - UNTOUCHED_TTL_S)
        gone = self._users.delete_expired_demo(iso(now), untouched)
        self._forget(*gone)
        unused = self._users.delete_unused_members(iso(now - UNUSED_ACCOUNT_TTL_S))
        self._forget(*unused)
        return len(gone[0]) + len(unused[0])

    def _forget(self, user_ids: list[str], board_ids: list[str]) -> None:
        for user_id in user_ids:
            self._sessions.end_all(user_id)
        for board_id in board_ids:
            self._live.recheck_board(board_id)
            self._live.end_public(board_id)
