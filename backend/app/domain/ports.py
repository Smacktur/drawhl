from __future__ import annotations

from typing import TYPE_CHECKING, Protocol

if TYPE_CHECKING:
    from app.domain.boards import BoardDoc, BoardRecord, BoardSummary
    from app.domain.tasks import Task


class TaskProvider(Protocol):
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


class BoardRepo(Protocol):
    def list(self) -> list[BoardSummary]: ...

    def create(self, name: str, doc: BoardDoc) -> BoardSummary: ...

    def get(self, board_id: str) -> BoardRecord | None: ...

    def save(self, board_id: str, version: int, doc: BoardDoc) -> int:
        """Compare-and-set on version; raises NotFound or VersionConflict, returns new version."""
        ...


class SnapshotRepo(Protocol):
    def get_many(self, keys: list[str]) -> dict[str, Task]: ...

    def put_many(self, tasks: list[Task]) -> None: ...
