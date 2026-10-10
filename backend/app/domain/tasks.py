import re
from datetime import UTC, datetime
from typing import Literal, NoReturn
from urllib.parse import urlparse

from pydantic import BaseModel

from app.domain.errors import DomainError, HostMismatch, InvalidRef
from app.domain.ports import SnapshotRepo, TaskProvider

KEY_RE = re.compile(r"^[A-Z][A-Z0-9_]+-\d+$")
_BROWSE_RE = re.compile(r"/browse/([A-Za-z][A-Za-z0-9_]+-\d+)/?$")

StatusCategory = Literal["new", "indeterminate", "done"]


class Task(BaseModel):
    key: str
    # not_found also covers a task the person's own token may not see: Jira hides both alike.
    # private: a guest of a public board sees the key only.
    state: Literal["ok", "not_found", "no_token", "private"] = "ok"
    summary: str = ""
    status_name: str = ""
    status_category: StatusCategory = "new"
    type_name: str = ""
    assignee_name: str | None = None
    priority_name: str | None = None
    updated: str | None = None
    url: str
    fetched_at: str


def now_iso() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds")


def parse_ref(ref: str, base_host: str) -> str:
    """Returns the issue key from a bare key or a `.../browse/KEY` URL on the configured host."""
    text = ref.strip()
    if text.startswith(("http://", "https://")):
        url = urlparse(text)
        match = _BROWSE_RE.search(url.path)
        if not match:
            raise InvalidRef("link is not a Jira issue URL")
        if url.hostname != base_host:
            raise HostMismatch(f"link host {url.hostname} does not match {base_host}")
        text = match.group(1)
    key = text.upper()
    if not KEY_RE.match(key):
        raise InvalidRef("expected an issue key like ABC-123 or an issue link")
    return key


def resolve_task(ref: str, provider: TaskProvider, snapshots: SnapshotRepo) -> Task:
    task = provider.resolve(parse_ref(ref, provider.base_host))
    snapshots.put_many([task])
    return task


MAX_SEARCH = 100


def search_tasks(
    jql: str, limit: int, provider: TaskProvider, snapshots: SnapshotRepo
) -> tuple[list[Task], int]:
    tasks, total = provider.search(jql.strip(), min(limit, MAX_SEARCH))
    snapshots.put_many(tasks)
    return tasks, total


class NoTokenProvider:
    """Stands in for Jira while the person has no usable token of their own.

    Cards keep their key and say how to connect; nothing is fetched with anyone else's token.
    """

    source_id = "jira"
    source_name = "Jira Data Center"

    def __init__(self, base_url: str | None, reason: DomainError) -> None:
        self._base_url = base_url or ""
        self._reason = reason

    @property
    def base_host(self) -> str:
        return urlparse(self._base_url).hostname or ""

    def poll(self, keys: list[str]) -> list[Task]:
        url = f"{self._base_url}/browse/" if self._base_url else ""
        return [
            Task(key=key, state="no_token", url=f"{url}{key}" if url else "", fetched_at=now_iso())
            for key in keys
        ]

    def _refuse(self, *_: object) -> NoReturn:
        raise self._reason

    resolve = check = search = jql_vocabulary = jql_values = _refuse
