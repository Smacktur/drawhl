# API Contract: GitHub Issues

Changes to the contract of [spec 013](../../013-task-sources/contracts/api.md). Errors use the common body `{"error": {"code", "message"}}`. The web app and the API ship together, so there is no old-client mode.

## Task

A GitHub task has the source `github` and a key `owner/repo#number`. `priority_name` is always `null`. `type_name` is `"Issue"` or `"Pull request"`.

```json
{"source": "github", "key": "octo-org/widgets#12", "state": "ok", "summary": "…",
 "status_name": "in progress", "status_category": "indeterminate", "type_name": "Issue",
 "assignee_name": "Alex Rivera", "priority_name": null, "updated": "2026-10-01T10:00:00+00:00",
 "url": "https://github.com/octo-org/widgets/issues/12", "fetched_at": "…",
 "labels": [{"name": "in progress", "color": "fbca04"}],
 "rows": [{"label": "Repository", "value": "octo-org/widgets"}]}
```

From slice 2 every task in every answer carries `labels` and `rows`; both are empty lists for the other sources. `color` is six hex digits without `#`.

## Changed routes

| Route | Change |
|---|---|
| `POST /api/tasks/resolve` | the request is unchanged; a `ref` that is a github.com issue or pull request link, or `owner/repo#number`, is answered by the GitHub source on every instance, anything else by the instance's tracker |
| `POST /api/tasks/search` | unchanged; still goes to the instance's tracker only |
| `POST /api/boards/{id}/refresh`, the public refresh | `sources` has a `github` entry when the board has GitHub tasks; a source entry gains an optional `note: string` ("Updates every few minutes without a token") |
| `GET /api/public/{token}`, its refresh | a GitHub task the shared reader can read is full, any other is `private` |
| `GET`, `PUT`, `DELETE /api/me/tracker` (slice 3) | take an optional `source` (`"jira"` by default, or `"github"`); the answer lists the token state per source; saving a GitHub token checks it against GitHub first |

## Errors

| Code | Status | When |
|---|---|---|
| `tracker_rate_limited` | 429 | GitHub's limit is used up; `retry_after` in the body, as for `jira_rate_limited` |
| `tracker_unavailable` | 503 | GitHub answers 5xx, or there is no network to api.github.com |
| `task_not_found` | 404 | no such repository or number, or a private one without a token that reads it |
| `too_many_repositories` | 429 | the shared reader already tracks its cap of repositories |

The Jira codes do not change.

## Board document

A card's `data`, a timer's `data.watch` and a Gantt task row with `source: "github"` take a key matching `^[A-Za-z0-9-]+/[A-Za-z0-9._-]+#[1-9][0-9]*$`. Every other source, and a missing one, keeps the Jira key pattern.

## Environment

`GITHUB_TOKEN`: optional, read-only, for public repositories. Without it GitHub tasks refresh every few minutes.

## Not changed

Settings → Task source, the JQL routes, boards, people and sharing.
