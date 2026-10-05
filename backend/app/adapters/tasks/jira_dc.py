from collections.abc import Callable
from urllib.parse import quote, urlparse

import httpx

from app.domain.errors import JiraRateLimited, JiraUnauthorized, JiraUnavailable, TaskNotFound
from app.domain.settings import JiraCredentials
from app.domain.tasks import StatusCategory, Task, now_iso

FIELDS = ["summary", "status", "issuetype", "assignee", "priority", "updated"]
SEARCH_CHUNK = 500
DEFAULT_RETRY_AFTER_S = 60

_CATEGORIES: dict[str, StatusCategory] = {
    "new": "new",
    "indeterminate": "indeterminate",
    "done": "done",
}


def _name(value: dict | None, field: str = "name") -> str | None:
    return value.get(field) if value else None


def to_task(base_url: str, issue: dict) -> Task:
    fields = issue["fields"]
    status = fields.get("status") or {}
    category = (status.get("statusCategory") or {}).get("key", "new")
    return Task(
        key=issue["key"],
        summary=fields.get("summary") or "",
        status_name=status.get("name") or "",
        status_category=_CATEGORIES.get(category, "new"),
        type_name=_name(fields.get("issuetype")) or "",
        assignee_name=_name(fields.get("assignee"), "displayName"),
        priority_name=_name(fields.get("priority")),
        updated=fields.get("updated"),
        url=f"{base_url}/browse/{issue['key']}",
        fetched_at=now_iso(),
    )


class JiraDcProvider:
    """Jira Data Center REST v2 with a personal access token (Bearer)."""

    def __init__(self, credentials: Callable[[], JiraCredentials], client: httpx.Client) -> None:
        self._credentials = credentials
        self._client = client

    @property
    def base_host(self) -> str:
        return urlparse(self._credentials().base_url).hostname or ""

    def _request(self, method: str, path: str, **kwargs) -> tuple[str, httpx.Response]:
        creds = self._credentials()
        headers = {
            "Authorization": f"Bearer {creds.token.get_secret_value()}",
            "Accept": "application/json",
        }
        try:
            response = self._client.request(
                method, f"{creds.base_url}{path}", headers=headers, **kwargs
            )
        except httpx.TimeoutException as exc:
            raise JiraUnavailable("Jira did not answer in time.") from exc
        except httpx.TransportError as exc:
            raise JiraUnavailable("Jira is unreachable. Check the URL and your network.") from exc
        if response.status_code in (401, 403):
            raise JiraUnauthorized(
                f"Jira returned {response.status_code}. Check your token in Settings."
            )
        if response.status_code == 429:
            retry_after = response.headers.get("retry-after", "")
            seconds = int(retry_after) if retry_after.isdigit() else DEFAULT_RETRY_AFTER_S
            raise JiraRateLimited("Jira is rate limiting requests", seconds)
        if response.status_code >= 500:
            raise JiraUnavailable(f"Jira returned {response.status_code}")
        return creds.base_url, response

    def check(self) -> str:
        _, response = self._request("GET", "/rest/api/2/myself")
        if response.status_code != 200:
            raise JiraUnavailable(f"Jira returned {response.status_code}")
        body = response.json()
        return body.get("displayName") or body.get("name") or "unknown user"

    def resolve(self, key: str) -> Task:
        base_url, response = self._request(
            "GET", f"/rest/api/2/issue/{quote(key)}", params={"fields": ",".join(FIELDS)}
        )
        # Jira DC answers 404 both for missing issues and for issues the token cannot see.
        if response.status_code == 404:
            raise TaskNotFound(f"{key} not found or you have no access")
        if response.status_code != 200:
            raise JiraUnavailable(f"Jira returned {response.status_code}")
        return to_task(base_url, response.json())

    def poll(self, keys: list[str]) -> list[Task]:
        found: dict[str, Task] = {}
        base_url = ""
        for start in range(0, len(keys), SEARCH_CHUNK):
            chunk = keys[start : start + SEARCH_CHUNK]
            base_url, response = self._request(
                "POST",
                "/rest/api/2/search",
                json={
                    "jql": f"key in ({','.join(chunk)})",
                    "fields": FIELDS,
                    "maxResults": len(chunk),
                },
            )
            if response.status_code != 200:
                raise JiraUnavailable(f"Jira returned {response.status_code}")
            for issue in response.json().get("issues", []):
                found[issue["key"]] = to_task(base_url, issue)
        return [
            found.get(key)
            or Task(
                key=key, state="not_found", url=f"{base_url}/browse/{key}", fetched_at=now_iso()
            )
            for key in keys
        ]
