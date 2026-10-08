---
description: "Task list for Instance password"
---

# Tasks: Instance password

**Input**: [spec.md](spec.md), [plan.md](plan.md)

**Tests**: included: token and middleware in pytest; sign-in screen in vitest; curl over every route; screenshot of the sign-in screen.

## Format: `[ID] [P?] [Story] Description`

- Backend paths under `backend/app/`, frontend paths under `frontend/src/`

## Phase 1: Slice 35 `feat/instance-password` — a public instance asks for a password (US1, US2) 🎯

**Goal**: no instance is readable without signing in.

**Independent Test**: see US1 and US2 in [spec.md](spec.md).

- [x] T001 [P] [US1] `config.py` `drawhl_password`; `domain/access.py` sign in, verify, limiter. Tests: expiry, tamper, password change, 5 failures then 429
- [x] T002 [US1] `adapters/password_file.py` generate once, 0600, log once; `api/auth.py` status, login, logout; `api/gate.py` middleware in `main.py`. Tests: open paths, 401 on every other route, generated password reused
- [x] T003 [US1] `nginx.conf.template` passes `X-Forwarded-Proto`; `Secure` cookie behind HTTPS. Test with the header
- [x] T004 [US1] Frontend: `api/auth.ts`, `auth/SignIn.tsx`, boot check and drop back on `auth_required`, "Sign out" in Settings. Tests
- [x] T005 [US1] `make smoke` and e2e sign in with the password from ENV
- [x] T006 [US2] Railway template variable `DRAWHL_PASSWORD=${{secret(20)}}`, template README; `.env.example`, README, quick-start guide, `CHANGELOG.md`
- [x] T007 [US1] curl over every route with and without a session; screenshot of the sign-in screen in light and dark; deploy from the template and sign in

**Checkpoint**: `make check`, curl list, screenshot → G3.
