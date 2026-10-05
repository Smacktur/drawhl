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

status, body = call("GET", f"{API}/api/hello?name=smoke")
check(status == 200 and body["message"] == "Hello, smoke!", "hello")

status, body = call("GET", f"{WEB}/api/hello")
check(status == 200 and body["message"].startswith("Hello"), "ui proxies /api")
