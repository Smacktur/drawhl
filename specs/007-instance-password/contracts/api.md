# API Contract: Instance password

Base path `/api`. Errors use the usual format `{"error": {"code": "...", "message": "..."}}`. The gate is always on; the password comes from `TIKO_PASSWORD` or a generated `data/password`.

## Auth

| Method, path | Request | Response | Errors |
|---|---|---|---|
| `GET /auth/status` | – | `{signed_in: bool}` | |
| `POST /auth/login` | `{password}` | 204, sets `tiko_session` | 401 `invalid_password`, 429 `too_many_attempts` with `Retry-After` |
| `POST /auth/logout` | – | 204, clears `tiko_session` | |

## Every other route

Without a valid session, every `/api/*` route outside `/api/auth/*`, and `/metrics`, `/docs`, `/openapi.json`, answers 401 `auth_required`. `/health` and `/ready` stay open.
