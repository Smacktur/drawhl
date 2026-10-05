import re
from datetime import UTC, datetime
from typing import Literal
from urllib.parse import urlparse

from pydantic import BaseModel

from app.domain.errors import HostMismatch, InvalidRef
from app.domain.ports import SnapshotRepo, TaskProvider

KEY_RE = re.compile(r"^[A-Z][A-Z0-9_]+-\d+$")
_BROWSE_RE = re.compile(r"/browse/([A-Za-z][A-Za-z0-9_]+-\d+)/?$")

StatusCategory = Literal["new", "indeterminate", "done"]


class Task(BaseModel):
    key: str
    state: Literal["ok", "not_found"] = "ok"
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


def select_provider(provider: str, demo: TaskProvider, jira: TaskProvider) -> TaskProvider:
    return jira if provider == "jira" else demo
