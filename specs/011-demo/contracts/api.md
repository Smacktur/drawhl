# API Contract: Demo accounts

Additions to the contracts of [spec 008](../../008-accounts/contracts/api.md) and [spec 012](../../012-public-link/contracts/api.md). Errors use the common body `{"error": {"code", "message"}}`.

Everything here exists only on an instance started with `TIKO_DEMO=1`. Without it the two new routes answer 404 `not_found`, the new fields are `false` and `null`, and no other answer changes.

## Types

```text
Me gains demo_expires_at: string | null    (set for a demo visitor, null for everyone else)
```

## Auth

| Method, path | Who | Request | Response | Errors |
|---|---|---|---|---|
| `GET /auth/status` | open | – | `{signed_in, me, demo: bool}`; `demo` says the instance is a demo | |
| `POST /auth/demo` | open | – | 204, sets `tiko_session` | 404 `not_found`, 429 `too_many_attempts`, 429 `demo_full` |
| `POST /auth/signup` | a demo visitor | `{name, username, password}` | `Me` with `demo_expires_at: null` | 404 `not_found`, 409 `username_taken`, 422 `weak_password`, 422 |

`POST /auth/demo`:

- Creates a person with role `member`, a generated username and the name `Demo visitor`, and starts a session as `POST /auth/login` does.
- A request that carries a valid session answers 204 and creates nobody.
- More than 5 demo visitors an hour from one client address: 429 `too_many_attempts` with `Retry-After`.
- 500 demo visitors alive on the instance: one who changed nothing is deleted to make room. When there is none: 429 `demo_full`, "The demo is full right now. Try again later."
- An IPv6 client address is counted by its /64 network.
- A demo visitor cannot sign in through `POST /auth/login`: it answers 401 `invalid_credentials` for a generated username whatever the password.

`POST /auth/signup`:

- `name`, `username` and `password` follow the rules of `POST /invites/{token}/accept`, with the same errors.
- The person keeps their id, their boards, their task statuses and the current session; other sessions of the person stay too.
- A person who is not a demo visitor, and a request without a session, get 404 `not_found`.

A demo visitor whose expiry has passed is signed out: every route answers them 401 `auth_required`, and their sockets close as for an ended session.

## Refused to a demo visitor

Each answers 403 `forbidden` with "Sign up to do this.":

| Route | What it is |
|---|---|
| `PUT /boards/{id}/members/{user_id}`, `DELETE /boards/{id}/members/{user_id}` | sharing |
| `PUT /boards/{id}/public` | the public link |
| `POST /boards/{id}/transfer` | a new owner |
| `PATCH /me`, `PUT /me/password` | name, username and password come with sign-up |

The "everyone" role and the tracker token are refused to everyone on a demo instance; see below.

## Changed on a demo instance, for everyone

| Route | Change |
|---|---|
| `POST /boards` | a person who is not an admin and owns 3 boards gets 409 `board_limit`, "A demo account holds 3 boards. Delete one to make another." The welcome board counts |
| `PUT /boards/{id}/everyone` | 403 `forbidden`: a demo instance has no "everyone" role |
| `PUT /me/tracker` | 403 `forbidden`: a demo instance stores no tracker tokens |
| `GET /people` | leaves demo visitors out |
| `GET /people/directory?q=` | answers the one person whose username equals `q`, case ignored, or nobody; never a demo visitor; an empty `q` answers nobody |
| `GET /boards` | an admin's list of other people's boards leaves out boards owned by demo visitors |
| `GET /settings` | `provider` is `demo` and is in `locked` |
| `PUT /demo/tasks/{key}/status` | changes the status for the person who asks, not for the instance |
| `POST /tasks/search`, `POST /tasks/resolve`, `POST /boards/{id}/refresh` | demo tasks carry the statuses of the person who asks |
| `GET /api/public/{token}`, `POST /api/public/{token}/refresh` | demo tasks carry the statuses of the board's owner |

## Client address

The web container's nginx sends `X-Real-IP` with the address of the client. It takes the address from `X-Forwarded-For` only when the request came from a private network (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`), which is where a proxy in front of tiko lives. The API reads the header only on a demo instance and only to count new demo visitors. A demo instance does not publish the API port.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `TIKO_DEMO` | off | `1` makes the instance a demo |

`TIKO_DEMO=1` with `TIKO_TRACKER=jira` stops the start with an error that names both variables.
