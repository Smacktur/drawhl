# Feature Specification: Instance password

**Feature Branch**: `007-instance-password`

**Created**: 2026-10-08

**Status**: Done

**Input**: User description: "We added the Deploy on Railway button, so anyone can bring up an instance and it is visible to the whole internet." Step 2 of the launch plan (one-click deploy with an instance password), approved at G1 on 2026-10-07. Step 0 of team mode, approved at G1 on 2026-10-08: `TIKO_PASSWORD` later becomes the first admin's password, so this work carries over.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A public instance asks for a password (Priority: P1)

Someone deploys tiko from the Railway template. The template generates a password. When they open the public URL, they see a sign-in screen with one password field instead of their boards. After entering the password they get the app as today and stay signed in on that browser for 30 days. A stranger who finds the URL sees only the sign-in screen, and every API call without a session returns 401.

**Why this priority**: The Railway template is public; without this, an instance shows boards to anyone and calls Jira with the owner's PAT.

**Independent Test**: start the stack with `TIKO_PASSWORD=correct-horse`, open http://localhost:3000: the sign-in screen shows. `curl localhost:8000/api/boards` returns 401 `auth_required`. Enter a wrong password: an error shows. Enter `correct-horse`: the board opens; reload: still signed in.

**Acceptance Scenarios**:

1. **Given** any instance, **When** a request without a valid session cookie hits any `/api/*` path except `/api/auth/*`, or `/metrics`, `/docs`, `/openapi.json`, **Then** it gets 401 with `{"error": {"code": "auth_required", ...}}`. `/health` and `/ready` stay open for platform health checks.
2. **Given** the sign-in screen, **When** the user submits the right password, **Then** the server sets an `HttpOnly`, `SameSite=Lax` session cookie, `Secure` when the request came over HTTPS, valid for 30 days, and the app loads.
3. **Given** a wrong password, **Then** the server answers 401 `invalid_password` after the same delay as a right one, and after 5 wrong attempts within a minute it answers 429 with `Retry-After` to every sign-in, right password included, until the minute passes. The counter is per instance, not per IP: `X-Forwarded-For` is set by the client and a per-IP limit is dodged by forging it.
4. **Given** a signed-in user, **When** they choose "Sign out" in Settings, **Then** the cookie is cleared and the sign-in screen shows.
5. **Given** the owner is signed in on a laptop and a phone, or someone else learned the old password, **When** the owner changes `TIKO_PASSWORD` and restarts, **Then** every browser signed in with the old password is signed out, including a stranger's.
6. **Given** `TIKO_PASSWORD` is not set, **When** the instance starts for the first time, **Then** it generates a random 20-character password, saves it to `data/password` (mode 0600) and prints it once to the log with the line `tiko password: <value>`; later starts reuse that file and log only where to find it. `docker compose up` still works without keys, and the instance is never open.

---

### User Story 2 - The Railway template is closed by default (Priority: P2)

The template sets `TIKO_PASSWORD` to a generated value, so a one-click deploy is never open. The owner finds the password in the service's Variables tab, as the template README says.

**Why this priority**: People click Deploy and skip the README; the safe default has to come from the template.

**Independent Test**: deploy from `railway.com/deploy/tiko`: the public URL shows the sign-in screen; the password from Variables opens it.

**Acceptance Scenarios**:

1. **Given** a fresh deploy from the template, **Then** `TIKO_PASSWORD` is set to a random 20-character value and the instance asks for it.
2. **Given** the README, the docs guide and the template README, **Then** each says where the password is and how to change it.

### Edge Cases

- `TIKO_SECRET_KEY` is not set: the session is signed with a key derived from the password, so it still works; changing the password signs everyone out.
- The API is reached directly on its own public domain, not through the web service: the same 401 applies.
- Prometheus scrapes `/metrics`: it gets 401 unless it sends the session cookie; open metrics on a private port are a later task. Noted in the README.
- `data/password` is deleted: the next start generates a new password and signs everyone out.
- `make smoke` and e2e tests sign in with the password from ENV.

## Requirements *(mandatory)*

- **FR-001**: The gate is always on. The password comes from `TIKO_PASSWORD` or, when it is not set, from a generated `data/password`. There is no switch to turn the gate off.
- **FR-002**: The password is compared in constant time and never logged or returned.
- **FR-003**: The session is a signed cookie, not a database row; checking it does not touch SQLite.
- **FR-004**: No new dependency.

## Success Criteria *(mandatory)*

- **SC-001**: No board, task, setting or metric is readable without signing in (curl check of every route).
- **SC-002**: A signed-in request adds under 1 ms of server time.
- **SC-003**: A fresh template deploy is closed without any manual step.
