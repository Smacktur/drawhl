"""Made-up Jira DC responses for httpx.MockTransport."""

import json

import httpx

# Obviously fake, assembled so secret scanners do not flag it.
TOKEN = "-".join(["fake", "pat", "for", "tests", "only"])


def issue(key: str, status: str = "In Progress", category: str = "indeterminate") -> dict:
    return {
        "key": key,
        "fields": {
            "summary": f"Summary of {key}",
            "status": {"name": status, "statusCategory": {"key": category}},
            "issuetype": {"name": "Bug"},
            "assignee": {"displayName": "Alex Rivera"},
            "priority": {"name": "High"},
            "updated": "2026-10-01T09:00:00.000+0000",
        },
    }


class FakeJira:
    """Serves known issues; `fail` forces a status code for every request."""

    def __init__(self, issues: dict[str, dict] | None = None) -> None:
        self.issues = issues or {"SRE-1": issue("SRE-1"), "SRE-2": issue("SRE-2", "Done", "done")}
        self.fail: int | None = None
        self.requests: list[httpx.Request] = []

    def __call__(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        if self.fail:
            headers = {"retry-after": "42"} if self.fail == 429 else {}
            return httpx.Response(self.fail, json={"errorMessages": ["nope"]}, headers=headers)
        if request.headers.get("authorization") != f"Bearer {TOKEN}":
            return httpx.Response(401, json={"errorMessages": ["unauthorized"]})
        path = request.url.path
        if path.endswith("/myself"):
            return httpx.Response(200, json={"name": "alex", "displayName": "Alex Rivera"})
        if "/issue/" in path:
            key = path.rsplit("/", 1)[1]
            if key in self.issues:
                return httpx.Response(200, json=self.issues[key])
            return httpx.Response(404, json={"errorMessages": ["Issue does not exist"]})
        if path.endswith("/search"):
            jql = json.loads(request.content)["jql"]
            keys = jql[jql.index("(") + 1 : jql.index(")")].split(",")
            found = [self.issues[k] for k in keys if k in self.issues]
            return httpx.Response(200, json={"issues": found, "total": len(found)})
        return httpx.Response(404)
