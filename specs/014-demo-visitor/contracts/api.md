# API Contract: Demo visitor

Changes to the contract of [spec 011](../../011-demo/contracts/api.md). Errors use the common body `{"error": {"code", "message"}}`. Nothing changes on an instance without `TIKO_DEMO` and without `TIKO_BOARD_LIMIT`, except the last row of "For everyone".

## For a demo visitor

| Route | Answer |
|---|---|
| `GET /settings` | `provider` is `demo`, `jira` is `{"base_url": null, "token_state": "none"}`, `locked` is empty, whatever the instance is set to |
| `GET /me/tracker` | `{"provider": "demo", "base_url": null, "token_state": "none"}` |
| `PUT /me/tracker` | 403 `forbidden`, "Sign up to do this." |
| `POST /settings/jira/test` | 403 `forbidden`, "Sign up to do this." |
| `POST /tasks/resolve`, `POST /tasks/search`, `GET /jql/vocabulary`, `GET /jql/values` | go to the demo tasks |
| `GET /boards/{id}` | `default_source` is `demo` |
| `POST /boards/{id}/refresh` | polls the demo tasks; a task of another source answers `not_found` |
| `GET /boards` | the welcome board made on the first read carries the demo note |

## For everyone

| Route | Change |
|---|---|
| `GET /settings` | on an instance with `TIKO_DEMO=1` the tracker is what the admin or `TIKO_TRACKER` set; `provider` is in `locked` only when `TIKO_TRACKER` is set |
| `PUT /me/tracker` | open to every person with an account on an instance with `TIKO_DEMO=1` |
| `POST /boards` | a person who is not an admin and owns as many boards as allowed gets 409 `board_limit`, "An account here holds N boards. Delete one to make another." N is 3 for a demo visitor and `TIKO_BOARD_LIMIT` for anyone else; without the variable only visitors are limited |
| `POST /boards/{id}/transfer` | a new owner who is not an admin and already owns as many boards as allowed: 409 `board_limit` |
| `POST /settings/jira/test` | a `base_url` in the request from a person who is not an admin: 403 `forbidden`. Without it the route tests the instance's address as before |

## Added after the slices

`GET /people/directory` with a non-empty `q` on an instance with `TIKO_DEMO=1`: more than 20 a minute from one person answer 429 `too_many_attempts` with `Retry-After`.

## Not changed

`PUT /boards/{id}/everyone`, `GET /people/directory`, the 90 days and the personal demo task statuses stay as spec 011 has them for an instance with `TIKO_DEMO=1`.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `TIKO_DEMO` | off | `1` lets anyone start as a demo visitor. Starts with any tracker |
| `TIKO_BOARD_LIMIT` | empty | boards a person with an account may own, admins aside; a whole number from 1 |
