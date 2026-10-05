# API Contract: Live Jira Canvas (MVP)

Base path `/api`. JSON only. Errors use the existing skeleton format `{"error": {"code": "...", "message": "..."}}`. No response ever contains the Jira token.

## Types

```text
BoardSummary = {id, name, updated_at}
Task = {
  key, state: "ok" | "not_found",
  summary, status_name, status_category: "new" | "indeterminate" | "done",
  type_name, assignee_name: string|null, priority_name: string|null,
  updated: string|null, url, fetched_at
}
Doc = see data-model.md
Settings = {
  provider: "demo" | "jira",
  refresh_interval_s: int,             # 30..300
  secret_key_configured: bool,
  jira: {base_url: string|null, token_state: "none" | "set" | "unreadable"}
}
```

## Boards

| Method, path | Request | Response | Errors |
|---|---|---|---|
| `GET /boards` | – | `{boards: BoardSummary[]}` | |
| `POST /boards` | `{name}` | 201 `BoardSummary` | 422 `invalid_request` |
| `GET /boards/{id}` | – | `{id, name, version, doc, tasks: {KEY: Task}, updated_at}` | 404 `not_found` |
| `PUT /boards/{id}` | `{version, doc}` | `{version}` (incremented) | 404, 409 `version_conflict`, 422 `invalid_request` (schema) or `validation_failed` (doc rules) |
| `PATCH /boards/{id}` | `{name}` | `BoardSummary` | 404, 422 |
| `DELETE /boards/{id}` | – | 204 | 404 |
| `POST /boards/{id}/refresh` | – (keys from the saved doc) | `{tasks: {KEY: Task}, fetched_at}` | 404, 400 `jira_not_configured`, 401 `jira_unauthorized`, 429 `jira_rate_limited` + `Retry-After`, 503 `jira_unavailable` |

## Tasks

| Method, path | Request | Response | Errors |
|---|---|---|---|
| `POST /tasks/resolve` | `{ref}` (key or issue URL) | `{task: Task}` | 422 `invalid_ref`, 422 `host_mismatch`, 404 `task_not_found` (also no access), 400 `jira_not_configured`, 401, 503 |

## Settings

| Method, path | Request | Response | Errors |
|---|---|---|---|
| `GET /settings` | – | `Settings` | |
| `PUT /settings` | `{provider?, refresh_interval_s?, jira?: {base_url, token?}}` (token omitted keeps the stored one) | `Settings` | 400 `secret_key_missing`, 422 `invalid_request` |
| `POST /settings/jira/test` | `{base_url?, token?}` (falls back to stored) | `{ok: true, user}` | 400 `secret_key_missing`, 401 `jira_unauthorized`, 503 `jira_unavailable` |

## Demo

| Method, path | Request | Response | Errors |
|---|---|---|---|
| `PUT /demo/tasks/{key}/status` | `{status}` | `{task: Task}` | 404 `task_not_found` |

`Done` and `Closed` map to `status_category: "done"`, `In Progress` and `In Review` to `indeterminate`, anything else to `new`.

## Existing (skeleton)

`GET /health`, `GET /ready`, `GET /metrics` unchanged.
