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

# The scenario runs on demo tasks; a connected Jira is switched back afterwards.
status, settings = call("GET", f"{API}/api/settings")
check(status == 200, "read settings")
call("PUT", f"{API}/api/settings", {"provider": "demo"})
# Boards made here are deleted at the end, so a run leaves the user's list as it was.
created: list[str] = []
try:
    status, board = call("POST", f"{API}/api/boards", {"name": "smoke"})
    created.append(board["id"])
    check(status == 201, "create board")

    status, body = call("POST", f"{API}/api/tasks/resolve", {"ref": "DEMO-1"})
    check(status == 200 and body["task"]["key"] == "DEMO-1", "resolve by key")

    status, body = call(
        "POST", f"{API}/api/tasks/resolve", {"ref": "https://jira.example.com/browse/DEMO-2"}
    )
    check(status == 200 and body["task"]["key"] == "DEMO-2", "resolve by link")

    doc = {
        "nodes": [
            {
                "id": "f",
                "type": "frame",
                "position": {"x": -40, "y": -40},
                "width": 400,
                "height": 300,
                "data": {"title": "Now"},
            },
            {
                "id": "a",
                "type": "jira_card",
                "position": {"x": 40, "y": 40},
                "parentId": "f",
                "data": {"key": "DEMO-1", "collapsed": False},
            },
            {
                "id": "b",
                "type": "jira_card",
                "position": {"x": 300, "y": 0},
                "data": {"key": "DEMO-2", "collapsed": False},
            },
            {
                "id": "s",
                "type": "sticky",
                "position": {"x": 600, "y": 0},
                "width": 200,
                "height": 200,
                "data": {"text": "Ask about certs", "color": "yellow"},
            },
            {
                "id": "t",
                "type": "text",
                "position": {"x": 600, "y": -60},
                "width": 240,
                "data": {"text": "Risks"},
            },
        ],
        "edges": [{"id": "e", "source": "s", "target": "b", "sourceHandle": "l", "targetHandle": "r"}],
        "viewport": {"x": 0, "y": 0, "zoom": 1},
    }
    status, body = call("PUT", f"{API}/api/boards/{board['id']}", {"version": 1, "doc": doc})
    check(status == 200 and body["version"] == 2, "save board")

    status, body = call("GET", f"{API}/api/boards/{board['id']}")
    check(body["doc"] == doc, "board with frame, sticky, text and arrow reopens unchanged")
    check(set(body["tasks"]) == {"DEMO-1", "DEMO-2"}, "board carries task snapshots")

    status, body = call("PUT", f"{API}/api/demo/tasks/DEMO-1/status", {"status": "Done"})
    check(status == 200, "change demo status")
    status, body = call("POST", f"{API}/api/boards/{board['id']}/refresh")
    check(
        status == 200 and body["tasks"]["DEMO-1"]["status_category"] == "done",
        "refresh shows the new status",
    )
    check(
        [(s["id"], s["state"]) for s in body["sources"]] == [("demo", "ok")],
        "refresh reports sync status per tracker",
    )

    status, other = call("POST", f"{API}/api/boards", {"name": "smoke other"})
    created.append(other["id"])
    other_doc = {
        "nodes": [
            {
                "id": "c",
                "type": "jira_card",
                "position": {"x": 0, "y": 0},
                "data": {"key": "DEMO-5"},
            }
        ]
    }
    status, _ = call("PUT", f"{API}/api/boards/{other['id']}", {"version": 1, "doc": other_doc})
    check(status == 200, "save second board")
    status, body = call("POST", f"{API}/api/boards/{board['id']}/refresh")
    check(status == 200 and "DEMO-5" not in body["tasks"], "only the open board is refreshed")

    row = {"id": "r", "key": "DEMO-7", "start": "2026-10-05", "end": "2026-10-09"}
    gantt = {"start": "2026-10-01", "end": "2026-12-31", "scale": "week", "rows": [row]}
    module_doc = {
        "nodes": [
            {
                "id": "g",
                "type": "module",
                "position": {"x": 0, "y": 0},
                "data": {"kind": "gantt", "content": gantt},
            },
            {
                "id": "u",
                "type": "module",
                "position": {"x": 0, "y": 400},
                "data": {"kind": "future_thing", "content": {"kept": [1, None]}},
            },
        ]
    }
    status, _ = call("PUT", f"{API}/api/boards/{other['id']}", {"version": 2, "doc": module_doc})
    check(status == 200, "save board with modules")
    status, body = call("GET", f"{API}/api/boards/{other['id']}")
    nodes = body["doc"]["nodes"]
    check(
        nodes[0]["data"]["content"]["rows"][0]["key"] == "DEMO-7"
        and nodes[1]["data"] == module_doc["nodes"][1]["data"],
        "gantt and unknown module reopen",
    )
    status, body = call("POST", f"{API}/api/boards/{other['id']}/refresh")
    check(status == 200 and "DEMO-7" in body["tasks"], "gantt tasks are refreshed")
    status, body = call("GET", f"{API}/api/boards/{other['id']}")
    check("DEMO-7" in body["tasks"], "board carries gantt task snapshots")
    module_doc["nodes"][0]["data"]["content"] = gantt | {"end": "2026-09-01"}
    status, _ = call("PUT", f"{API}/api/boards/{other['id']}", {"version": 3, "doc": module_doc})
    check(status == 422, "invalid gantt rejected")
    child = {"id": "c", "title": "Child", "start": "2026-10-05", "end": "2026-10-06", "parent": "r"}
    orphan = child | {"id": "o", "parent": "missing"}
    module_doc["nodes"][0]["data"]["content"] = gantt | {"rows": [row, child]}
    status, _ = call("PUT", f"{API}/api/boards/{other['id']}", {"version": 3, "doc": module_doc})
    check(status == 200, "gantt rows nest in a tree")
    module_doc["nodes"][0]["data"]["content"] = gantt | {"rows": [row, orphan]}
    status, _ = call("PUT", f"{API}/api/boards/{other['id']}", {"version": 4, "doc": module_doc})
    check(status == 422, "row under a missing parent rejected")

    status, body = call("POST", f"{API}/api/tasks/search", {"jql": 'status = "Backlog"'})
    check(
        status == 200 and {t["key"] for t in body["tasks"]} == {"DEMO-5", "DEMO-12"},
        "add cards by JQL",
    )

    status, body = call("GET", f"{API}/api/jql/vocabulary")
    check(status == 200 and any(f["name"] == "status" for f in body["fields"]), "jql vocabulary")
    status, body = call("GET", f"{API}/api/jql/values?field=status&prefix=in")
    check(status == 200 and body["values"][0]["value"] == '"In Progress"', "jql values")
    status, body = call("POST", f"{API}/api/tasks/search", {"jql": 'status = "Closed"', "limit": 0})
    check(status == 200 and body["total"] == 1 and body["tasks"] == [], "jql match count")

    status, body = call("PATCH", f"{API}/api/boards/{board['id']}", {"name": "smoke renamed"})
    check(status == 200 and body["name"] == "smoke renamed", "rename board")
    status, body = call("PUT", f"{API}/api/boards/{board['id']}", {"version": 2, "doc": doc})
    check(status == 200, "rename keeps the board saving")

    status, _ = call("DELETE", f"{API}/api/boards/{other['id']}")
    check(status == 204, "delete board")
    status, body = call("GET", f"{API}/api/boards")
    ids = {b["id"] for b in body["boards"]}
    check(other["id"] not in ids and board["id"] in ids, "deleted board leaves the list")

    status, body = call("GET", f"{WEB}/api/boards")
    check(status == 200 and any(b["id"] == board["id"] for b in body["boards"]), "ui proxies /api")

finally:
    call("PUT", f"{API}/api/demo/tasks/DEMO-1/status", {"status": "In Progress"})
    call("PUT", f"{API}/api/settings", {"provider": settings["provider"]})
    for board_id in created:
        call("DELETE", f"{API}/api/boards/{board_id}")

status, body = call("GET", f"{API}/api/settings")
check(status == 200 and set(body["jira"]) == {"base_url", "token_state"}, "settings hide token")
check(isinstance(body["secret_key_configured"], bool), "secret key state reported")
