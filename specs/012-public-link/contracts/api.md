# API Contract: Public link

Additions to the contract of [spec 008](../../008-accounts/contracts/api.md). Errors use the common body `{"error": {"code", "message"}}`.

## For people on the board

| Route | Who | Change |
|---|---|---|
| `GET /api/boards`, `GET /api/boards/{id}`, `POST /api/boards`, `PATCH /api/boards/{id}` | as before | each board gains `public: bool` |
| `GET /api/boards/{id}/members` | viewer and up | gains `public: bool` and `public_token: string \| null`; the token is sent to the owner (and an admin) only |
| `PUT /api/boards/{id}/public` | owner | body `{"public": bool}`, answers `{"public": bool, "public_token": string \| null}` |
| `GET /api/settings` | signed in | gains `public_links: bool` |
| `PUT /api/settings` | admin | accepts `public_links: bool` |

`PUT /api/boards/{id}/public`:

- `true` on a board that is already public keeps its token; two requests at once get the same one.
- `false` removes the token; the next `true` makes a new one.
- `true` while `public_links` is off answers 403 `forbidden`; `false` always works.

The page of a public board is `/p/{public_token}`.

## For guests

Open without a session. A session cookie, when the browser sends one, is ignored.

| Route | Answer |
|---|---|
| `GET /api/public/{token}` | `{name, updated_at, version, doc, tasks, refresh_interval_s}` |
| `GET /api/public/{token}/version` | `{version, updated_at}`; a rename changes `updated_at` only |
| `POST /api/public/{token}/refresh` | `{tasks, fetched_at, sources}`, as `POST /api/boards/{id}/refresh` |

- `doc` is the board document as `GET /api/boards/{id}` returns it.
- With the demo tracker `tasks` holds the demo tasks in full, and `refresh` polls them.
- With any tracker that is read with a person's token every task comes as `{key, state: "private", url}` with the other fields empty, and `sources` is empty. `Task.state` gains the value `private`.
- An unknown token, a token that was turned off, a deleted board and an instance with `public_links` off all answer 404 `not_found` with the same body.
- More than 3000 requests a minute through one link answer 429 `too_many_attempts` with `Retry-After`. The limit is per link, not per address: the API runs behind proxies and does not see who is asking.
- No other method or path under `/api/public/` exists.

## Headers of the page

`/p/*` is served with `X-Robots-Tag: noindex, nofollow`, `Referrer-Policy: no-referrer` and `Cache-Control: no-cache`.
