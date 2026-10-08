# Implementation Plan: Accounts and roles

**Branch**: `008-accounts` | **Date**: 2026-10-08 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/008-accounts/spec.md`

## Summary

People with usernames and passwords replace the single instance password; its value becomes the first admin's. Sessions move from a stateless signed cookie to a database table so they can be revoked. Boards get an owner, members with roles and an "everyone" setting, checked in one domain function. The tracker token and the task cache become per person. Delivered in 5 slices; each is usable alone and keeps `main` running.

## Technical Context

**Language/Version**: Python 3.12 + FastAPI, TypeScript + React 19

**Primary Dependencies**: existing only. Password hashing with `hashlib.scrypt`, tokens with `secrets`, no auth framework.

**Storage**: SQLite, one migration plus an upgrade step in code ([data-model.md](data-model.md)). Postgres comes in a later spec; keep SQL portable (no SQLite-only functions besides `lower()` in the unique index).

**Testing**: pytest per slice: the upgrade from a v2026.10.9 database fixture, an access matrix (person × role × route) as one parametrized test, per-person snapshots with a fake Jira that answers differently per token. vitest for sign-in, invite accept, People, Share dialog and read-only canvas. `make smoke` signs in as `admin`. Screenshots per slice with made-up data only.

**Constraints**: works without keys; no mail; under 1 ms per signed-in request; API change announced in `CHANGELOG.md`.

## Constitution Check

| Principle | Status |
|---|---|
| I. Main always runs | Pass: one `feat/<slice>` branch per slice; the upgrade step keeps old data working |
| II. Works without keys | Pass: invites are links, no mail server |
| III. Hypothesis-driven scope | Pass: team mode moved out of Won't at G1 on 2026-10-08 |
| IV. Vertical slices | Pass: 5 slices; 37 is UI only (it moves existing forms), the rest carry UI, API and storage |
| V. Contract-first | Pass: [contracts/api.md](contracts/api.md) |
| VI. Production feel, minimal | Pass: no auth framework, no new dependency |
| VII. Clean code | Pass |
| VIII. Verifiable tasks | Pass: upgrade fixture, access matrix, per-token fake Jira |

## Design

```text
backend/app/domain/accounts.py     Person, hash_password/verify_password (scrypt), username rules, sign-in limiter per username
backend/app/domain/sessions.py     start(person) -> token, resolve(token) -> Person | None, end, end_all; 30 s cache
backend/app/domain/invites.py      create, open, accept (invite and reset)
backend/app/domain/members.py      effective_role(person, board), require(person, board, role); share, transfer
backend/app/domain/upgrade.py      bootstrap admin from the instance password; move token, owners, snapshots
backend/app/adapters/storage/sqlite.py   UserRepo, SessionRepo, InviteRepo, MemberRepo, CredentialRepo; snapshots keyed by user
backend/app/api/gate.py            resolves the session to a Person in request.state.person (replaces Access)
backend/app/api/deps.py            current_person, current_admin, board_role(min_role)
backend/app/api/me.py, people.py, invites.py, members.py
frontend/src/auth/SignIn.tsx       username + password
frontend/src/auth/AcceptInvite.tsx ?invite=<token> and ?reset=<token>
frontend/src/settings/             SettingsDialog with sections: Profile, Security, Preferences, My tracker; Instance group (admin): Task source, People
frontend/src/board/ShareDialog.tsx members list, add person, role select, everyone, transfer
frontend/src/canvas/               read-only mode for viewers: no toolbar, no drag, "View only" badge
```

The provider for a request is built from the instance settings plus the person's credentials: `JiraDcProvider(lambda: creds_for(person), client)`. The refresh service and snapshot repo take a `user_id` (`''` for demo). Cards with state `forbidden` or `no_token` render a locked card with the key only.

What carries over from spec 007:

- Cookie name, attributes and `X-Forwarded-Proto` handling stay; only the value changes from a signed expiry to a random token looked up in `sessions`.
- `PasswordGate` stays the single place that turns a cookie into a person; open paths grow by the invite routes.
- The instance-wide failure limit stays as a backstop. The per-username limit is new; never key a limit by `X-Forwarded-For`, the client sets it.
- `reloadOnce` for stale chunks in `App.tsx` stays; new lazy screens use the same pattern.
- `register_secret` masks the bootstrap password in logs after the one deliberate print.

What changes for tooling:

- `backend/tests/conftest.py` `signed_in()` posts `{username: "admin", password}`; the autouse `DRAWHL_PASSWORD` fixture still seeds the admin.
- `scripts/smoke.py` signs in as `admin`; add a member flow (invite, accept, share, viewer gets 403 on save).
- The Railway template keeps `DRAWHL_PASSWORD=${{secret(20)}}`; README and guide say it is the `admin` password.

## Slices

| # | Branch | Stories | Done when |
|---|---|---|---|
| 36 | `feat/accounts` | US1 | upgrade fixture opens as `admin`; change password; sign out everywhere |
| 37 | `feat/settings` | US5 | settings window with sections replaces the sheet; deep link; narrow screen |
| 38 | `feat/people` | US2 | invite → accept → signed in; disable; reset |
| 39 | `feat/sharing` | US3 | access matrix green; viewer read-only; admin "All boards" |
| 40 | `feat/my-tracker` | US4 | per-token fake Jira: no task data crosses people |

Slice 40 must land before any release that lets a second person in with the Jira provider: until then a member would see snapshots made with the admin's token. No release between slices 38 and 40 (decided at G2). Slice 37 has no such limit and can ship on its own.

## Risks

| Risk | Plan B |
|---|---|
| Upgrade bug locks the owner out | Upgrade runs in one transaction; on failure the API refuses to start with a clear log line and the old data untouched; `make backup` runs before `make up` |
| scrypt at n=2^14 is slow on small hosts | About 50 ms per sign-in on Railway's smallest plan is acceptable; only sign-in pays it |
| Per-person snapshots multiply Jira calls on a shared board | Each person refreshes only while they have the board open, as today; real-time (009) can share refreshes among people with the same token scope later |
| Viewer read-only mode misses an edit path (paste, undo, module controls) | One `readOnly` flag from the board role read by the canvas store; tests try each edit path |
