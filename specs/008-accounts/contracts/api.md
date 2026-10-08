# API Contract: Accounts and roles

Base path `/api`. Errors use `{"error": {"code": "...", "message": "..."}}`. Without a valid session every route except the open ones answers 401 `auth_required` (spec 007). A signed-in person without the needed role gets 403 `forbidden`; a board they cannot see answers 404 `not_found`.

Open routes: `/health`, `/ready`, `GET /auth/status`, `POST /auth/login`, `POST /auth/logout`, `GET /invites/{token}`, `POST /invites/{token}/accept`.

## Types

```text
Me = {id, username, name, role: "admin" | "member"}
Person = {id, username, name, role, disabled: bool, last_sign_in_at: string|null, created_at}
Invite = {id, kind: "invite" | "reset", role: string|null, username: string|null, expires_at, created_at}
BoardSummary = {id, name, updated_at, my_role: "owner" | "editor" | "viewer", owner: {id, name}}
Member = {user: {id, username, name}, role: "owner" | "editor" | "viewer"}
Task.state gains "forbidden" (token cannot see it) and "no_token" (person has no token); both carry only `key`.
```

## Auth (changed from spec 007)

| Method, path | Request | Response | Errors |
|---|---|---|---|
| `GET /auth/status` | – | `{signed_in: bool, me: Me|null}` | |
| `POST /auth/login` | `{username, password}` | 204, sets `drawhl_session` | 401 `invalid_credentials`, 403 `account_disabled`, 429 `too_many_attempts` |
| `POST /auth/logout` | – | 204 | |
| `POST /auth/logout-all` | – | 204, ends every session of this person | |

## Me

| Method, path | Request | Response | Errors |
|---|---|---|---|
| `PATCH /me` | `{name?, username?}` | `Me` | 409 `username_taken`, 422 |
| `PUT /me/password` | `{current, new}` | 204, other sessions end | 401 `invalid_credentials`, 422 `weak_password` |
| `GET /me/tracker` | – | `{provider, token_state: "none" | "set" | "unreadable"}` | |
| `PUT /me/tracker` | `{token}` | `{token_state}` | 400 `secret_key_missing`, 422 |
| `DELETE /me/tracker` | – | 204 | |
| `POST /me/tracker/test` | `{token?}` | `{display_name}` | 401 `jira_unauthorized`, 503 |

## People and invites (admin only)

| Method, path | Request | Response | Errors |
|---|---|---|---|
| `GET /people` | – | `{people: Person[], invites: Invite[]}` | 403 |
| `PATCH /people/{id}` | `{role?, disabled?}` (`disabled: false` enables again) | `Person` | 403, 404, 409 `last_admin` |
| `POST /invites` | `{role}` | 201 `{invite: Invite, url}` (`url` is relative, `/?invite=<token>`, shown once; the browser adds its own origin) | 403 |
| `POST /people/{id}/reset` | – | 201 `{invite: Invite, url}` (`/?reset=<token>`) | 403, 404 |
| `DELETE /invites/{id}` | – | 204 | 403, 404 |
| `GET /invites/{token}` | – | `{kind, role, username: string|null}` | 410 `invite_expired` |
| `POST /invites/{token}/accept` | invite: `{username, name, password}`; reset: `{password}` | 204, sets `drawhl_session` | 409 `username_taken`, 410 `invite_expired`, 422 `weak_password` |

## Boards (changed)

All existing board routes check the effective role: read routes (`GET /boards/{id}`, `POST /boards/{id}/refresh`, task search on the board) need viewer; `PUT /boards/{id}` and `PATCH` (rename) need editor; `DELETE` needs owner.

| Method, path | Request | Response | Errors |
|---|---|---|---|
| `GET /boards` | – | `{boards: BoardSummary[], all: BoardSummary[]}` (`all` only for admins: boards they have no role on) | |
| `GET /boards/{id}` | – | `Board` = `BoardSummary` + `{version, doc, tasks}`; `my_role` drives the read-only canvas | 404 |
| `POST /boards` | `{name}` | 201 `BoardSummary`, the creator is the owner | |
| `GET /boards/{id}/members` | – | `{members: Member[], everyone_role: null | "viewer" | "editor"}` | 404 |
| `PUT /boards/{id}/members/{user_id}` | `{role: "editor" | "viewer"}` | `Member` | 403, 404 |
| `DELETE /boards/{id}/members/{user_id}` | – | 204 | 403, 404, 409 `owner_required` |
| `PUT /boards/{id}/everyone` | `{role: null | "viewer" | "editor"}` | 204 | 403, 404 |
| `POST /boards/{id}/transfer` | `{user_id}` | 204, old owner becomes editor | 403, 404 |
| `GET /people/directory` | `?q=` | `{people: [{id, username, name}]}` (active people, for the share picker; any signed-in person) | |

## Settings (changed)

`GET /settings` returns the instance settings to everyone; `PUT /settings` (provider, Jira URL, refresh interval) needs admin. The `jira_token_enc` field moves to `/me/tracker`.
