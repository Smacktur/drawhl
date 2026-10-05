"""Pushes stage secrets from the local .env to Render, so nobody types them into the dashboard.

Usage: python3 scripts/stage-env.py [--check | --deploy]
Env:   RENDER_API_KEY. Secret values: environment first, then the project's gitignored .env.

Secrets are the `sync: false` keys of the stage services in render.yaml; plain `value:` keys
reach Render through Blueprint auto-sync. Prints the names of services whose env changed,
never the values; --deploy also redeploys them, since running instances keep the old env.
--check changes nothing and exits 1 on a difference. A key missing locally stays as is on Render.
"""

import json
import os
import re
import sys
import urllib.error
import urllib.request

API = "https://api.render.com/v1"


def secret_keys(path: str = "render.yaml") -> dict[str, list[str]]:
    """Service name -> its `sync: false` keys, for the stage environment."""
    keys: dict[str, list[str]] = {}
    service, key = "", None
    with open(path, encoding="utf-8") as file:
        lines = file.readlines()
    for line in lines:
        if m := re.match(r"\s*- name: (\S+)", line):
            # Projects and environments share this shape; only services are followed by keys.
            service, key = m.group(1), None
        elif m := re.match(r"\s*name: (\S+)", line):
            service, key = m.group(1), None
        elif m := re.match(r"\s*- key: (\S+)", line):
            key = m.group(1)
        elif re.match(r"\s*sync: false", line) and key and service.endswith("-stage"):
            keys.setdefault(service, []).append(key)
    return keys


def local_value(name: str) -> str:
    if value := os.environ.get(name):
        return value
    try:
        with open(".env", encoding="utf-8") as file:
            for line in file:
                key, sep, value = line.strip().partition("=")
                if sep and key == name:
                    return value.strip().strip("'\"")
    except FileNotFoundError:
        pass
    return ""


def call(method: str, path: str, body: dict | None = None) -> dict | list | None:
    request = urllib.request.Request(
        API + path,
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={
            "Authorization": f"Bearer {os.environ['RENDER_API_KEY']}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        if error.code == 404:
            return None
        raise SystemExit(f"Render API {method} {path}: {error.code}") from error


def main() -> int:
    check, deploy = "--check" in sys.argv, "--deploy" in sys.argv
    if not os.environ.get("RENDER_API_KEY"):
        print("RENDER_API_KEY is not set", file=sys.stderr)
        return 1
    listed = call("GET", "/services?limit=100")
    services = {s["service"]["name"]: s["service"]["id"] for s in listed}
    changed, missing = [], []
    for name, keys in secret_keys().items():
        if name not in services:
            print(f"{name}: not in Render, skipped", file=sys.stderr)
            continue
        for key in keys:
            value = local_value(key)
            if not value:
                missing.append(key)
                continue
            current = call("GET", f"/services/{services[name]}/env-vars/{key}")
            if current and current.get("value") == value:
                continue
            print(f"{name}: {key} {'differs' if check else 'updated'}", file=sys.stderr)
            if not check:
                call("PUT", f"/services/{services[name]}/env-vars/{key}", {"value": value})
            if name not in changed:
                changed.append(name)
    for key in missing:
        print(f"{key}: not in .env, Render keeps its value", file=sys.stderr)
    if deploy and not check:
        for name in changed:
            started = call("POST", f"/services/{services[name]}/deploys", {})
            print(f"{name}: redeploy {started['id']}", file=sys.stderr)
    print("\n".join(changed))
    return 1 if check and changed else 0


if __name__ == "__main__":
    sys.exit(main())
