from __future__ import annotations

from typing import TYPE_CHECKING, Protocol

if TYPE_CHECKING:
    from app.domain.accounts import Person, PersonRecord, Role
    from app.domain.boards import BoardDoc, BoardRecord, BoardSummary
    from app.domain.invites import Invite
    from app.domain.jql import JqlValue, JqlVocabulary
    from app.domain.tasks import Task
    from app.domain.updates import Release


class TaskProvider(Protocol):
    source_id: str
    """Stable tracker id, such as "jira"; the sync status is reported per id."""
    source_name: str

    @property
    def base_host(self) -> str: ...

    def resolve(self, key: str) -> Task:
        """Raises TaskNotFound when the task is missing or not visible."""
        ...

    def poll(self, keys: list[str]) -> list[Task]:
        """Missing keys come back with state="not_found"."""
        ...

    def check(self) -> str:
        """Display name of the authenticated user."""
        ...

    def search(self, jql: str, limit: int) -> tuple[list[Task], int]:
        """Up to `limit` matching tasks and the total match count; raises InvalidJql."""
        ...

    def jql_vocabulary(self) -> JqlVocabulary:
        """Fields the user can search, with their operators, and JQL functions."""
        ...

    def jql_values(self, field: str, prefix: str) -> list[JqlValue]: ...


class BoardRepo(Protocol):
    def list(self) -> list[BoardSummary]: ...

    def create(self, name: str, doc: BoardDoc) -> BoardSummary: ...

    def create_first(self, name: str, doc: BoardDoc) -> BoardSummary | None:
        """Creates the board only on a store that never had a board."""
        ...

    def get(self, board_id: str) -> BoardRecord | None: ...

    def save(self, board_id: str, version: int, doc: BoardDoc) -> int:
        """Compare-and-set on version; raises NotFound or VersionConflict, returns new version."""
        ...

    def rename(self, board_id: str, name: str) -> BoardSummary:
        """Leaves the doc version alone so open tabs keep saving; raises NotFound."""
        ...

    def delete(self, board_id: str) -> None:
        """Raises NotFound."""
        ...


class SnapshotRepo(Protocol):
    def get_many(self, keys: list[str]) -> dict[str, Task]: ...

    def put_many(self, tasks: list[Task]) -> None: ...


class SecretBox(Protocol):
    def encrypt(self, plain: str) -> str:
        """Raises SecretKeyMissing when no key is configured."""
        ...

    def decrypt(self, token: str) -> str:
        """Raises SecretUnreadable when the key is missing or different."""
        ...


class SettingsRepo(Protocol):
    def get_all(self) -> dict[str, str]: ...

    def set_many(self, values: dict[str, str | None]) -> None:
        """None deletes the key."""
        ...


class DemoTasks(Protocol):
    def set_status(self, key: str, status: str) -> Task: ...


class ReleaseFeed(Protocol):
    def latest(self) -> Release:
        """Newest published release; raises DependencyUnavailable when it can't be fetched."""
        ...


class UserRepo(Protocol):
    def count(self) -> int: ...

    def add(self, person: Person, password_hash: str) -> None:
        """Raises UsernameTaken."""
        ...

    def find(self, username: str) -> tuple[Person, str] | None:
        """The person and their password hash, matching the username without regard to case."""
        ...

    def update(self, person: Person) -> None:
        """Saves name and username; raises UsernameTaken."""
        ...

    def set_password(self, user_id: str, password_hash: str) -> None: ...

    def get(self, user_id: str) -> Person | None: ...

    def list(self) -> list[PersonRecord]: ...

    def set_role(self, user_id: str, role: Role) -> None: ...

    def set_disabled(self, user_id: str, disabled: bool) -> None: ...

    def active_admins(self) -> int: ...

    def touch_sign_in(self, user_id: str) -> None: ...


class SessionRepo(Protocol):
    def add(self, token_hash: str, user_id: str, expires_at: str, created_at: str) -> None: ...

    def get(self, token_hash: str) -> tuple[Person, str] | None:
        """The person and the session's expiry."""
        ...

    def delete(self, token_hash: str) -> None: ...

    def delete_for_user(self, user_id: str, keep: str | None) -> None: ...

    def delete_expired(self, now: str) -> None: ...


class InviteRepo(Protocol):
    def add(self, invite: Invite, token_hash: str, created_by: str) -> None: ...

    def find_open(self, token_hash: str, now: str) -> Invite | None:
        """Not used, not revoked and not expired."""
        ...

    def consume(self, invite_id: str, now: str) -> bool:
        """Marks it used; False when another request used it first."""
        ...

    def unconsume(self, invite_id: str) -> None: ...

    def pending(self, now: str) -> list[Invite]: ...

    def revoke(self, invite_id: str, now: str) -> bool:
        """False when no open invite has this id."""
        ...
