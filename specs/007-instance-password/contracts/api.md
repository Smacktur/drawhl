# API Contract: Instance password

Base path `/api`. Errors use the usual format `{"error": {"code": "...", "message": "..."}}`. Everything here applies only when `DRAWHL_PASSWORD` is set; without it `/api/auth/status` returns `{gate: false, signed_in: true}` and nothing else changes.

## Auth

| Method, path | Request | Response | Errors |
|---|---|---|---|
| `GET /auth/status` | – | `{gate: bool, signed_in: bool}` | |
| `POST /auth/login` | `{password}` | 204, sets `drawhl_session` | 401 `invalid_password`, 429 `too_many_attempts` with `Retry-After` |
| `POST /auth/logout` | – | 204, clears `drawhl_session` | |

## Every other route

With the gate on and no valid session, every `/api/*` route outside `/api/auth/*`, and `/metrics`, `/docs`, `/openapi.json`, answers 401 `auth_required`. `/health` and `/ready` stay open.
