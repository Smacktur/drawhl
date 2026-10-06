import httpx

from app.domain.errors import DependencyUnavailable
from app.domain.updates import Release


class GitHubReleaseFeed:
    """Latest release of a public GitHub repository; no token, one call per check."""

    def __init__(self, repo: str, client: httpx.Client) -> None:
        self._url = f"https://api.github.com/repos/{repo}/releases/latest"
        self._client = client

    def latest(self) -> Release:
        try:
            response = self._client.get(
                self._url, headers={"Accept": "application/vnd.github+json"}
            )
            response.raise_for_status()
            body = response.json()
            return Release(version=body["tag_name"].removeprefix("v"), url=body["html_url"])
        except (httpx.HTTPError, ValueError, KeyError, TypeError) as exc:
            raise DependencyUnavailable("Could not check GitHub for a new release.") from exc
