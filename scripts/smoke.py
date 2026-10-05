"""Core scenario against a running stack. Stdlib only: runs inside the api container
(`make smoke`) or on the host against stage (`make stage-smoke`)."""

import json
import os
import urllib.error
import urllib.request

API = os.environ.get("SMOKE_API_URL", "http://localhost:8000")
WEB = os.environ.get("SMOKE_WEB_URL", "http://web:3000")


def call(method: str, url: str, body: dict | None = None) -> tuple[int, dict | None]:
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(
        url, data=data, method=method, headers={"content-type": "application/json"}
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            raw = response.read()
            return response.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as error:
        return error.code, json.loads(error.read() or b"null")


def check(condition: bool, label: str) -> None:
    if not condition:
        raise SystemExit(f"FAIL {label}")
    print(f"ok   {label}")


status, _ = call("GET", f"{API}/health")
check(status == 200, "health")

status, board = call("POST", f"{API}/api/boards", {"name": "smoke"})
check(status == 201, "create board")

status, body = call("POST", f"{API}/api/tasks/resolve", {"ref": "DEMO-1"})
check(status == 200 and body["task"]["key"] == "DEMO-1", "resolve by key")

status, body = call(
    "POST", f"{API}/api/tasks/resolve", {"ref": "https://jira.example.com/browse/DEMO-2"}
)
check(status == 200 and body["task"]["key"] == "DEMO-2", "resolve by link")

doc = {
    "nodes": [
        {"id": "a", "type": "jira_card", "position": {"x": 0, "y": 0}, "data": {"key": "DEMO-1"}},
        {"id": "b", "type": "jira_card", "position": {"x": 300, "y": 0}, "data": {"key": "DEMO-2"}},
    ],
    "edges": [],
    "viewport": {"x": 0, "y": 0, "zoom": 1},
}
status, body = call("PUT", f"{API}/api/boards/{board['id']}", {"version": 1, "doc": doc})
check(status == 200 and body["version"] == 2, "save board")

status, body = call("GET", f"{API}/api/boards/{board['id']}")
positions = [n["position"] for n in body["doc"]["nodes"]]
check(positions == [{"x": 0, "y": 0}, {"x": 300, "y": 0}], "board reopens unchanged")
check(set(body["tasks"]) == {"DEMO-1", "DEMO-2"}, "board carries task snapshots")

status, body = call("GET", f"{WEB}/api/boards")
check(status == 200 and any(b["id"] == board["id"] for b in body["boards"]), "ui proxies /api")
