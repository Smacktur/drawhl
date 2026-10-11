# API Contract: Task sources

Changes to the contracts of [spec 001](../../001-live-jira-canvas/contracts/) and [spec 012](../../012-public-link/contracts/api.md). Errors use the common body `{"error": {"code", "message"}}`. The web app and the API ship together, so there is no old-client mode.

## Task

Every task in every answer gains `source: string`.

```json
{"source": "jira", "key": "ABC-12", "state": "ok", "summary": "…", "status_name": "In Progress",
 "status_category": "indeterminate", "type_name": "Task", "assignee_name": null,
 "priority_name": "High", "updated": "2026-10-01T10:00:00+00:00", "url": "…", "fetched_at": "…"}
```

## Changed answers

| Route | Change |
|---|---|
| `GET /api/boards/{id}` | `tasks` is keyed by ref (`"jira:ABC-12"`), not by key; gains `default_source: string`, the tracker of a task that names none |
| `POST /api/boards/{id}/refresh` | `tasks` is keyed by ref; `sources` has one entry per source of the board |
| `GET /api/public/{token}`, its refresh | `tasks` is keyed by ref; a task is `private` or full by its source; the board gains `default_source`; the refresh lists the demo source when the board has demo tasks |
| `POST /api/tasks/resolve`, `POST /api/tasks/search` | tasks carry `source`; the request is unchanged and goes to the instance's tracker |

## Board document

`PUT /api/boards/{id}` and the live socket accept an optional `source` on a card's `data`, on a timer's `data.watch` and on a Gantt task row. A document without it is valid and means the instance's tracker. An unknown source id is accepted and its task answers `not_found`.

## Not changed

Settings, credentials, JQL routes and every route about people and sharing.
