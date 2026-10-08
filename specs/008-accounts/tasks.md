---
description: "Task list for Accounts and roles"
---

# Tasks: Accounts and roles

**Input**: [spec.md](spec.md), [plan.md](plan.md), [data-model.md](data-model.md), [contracts/api.md](contracts/api.md)

**Tests**: included in every slice; screenshots with made-up data only.

## Format: `[ID] [P?] [Story] Description`

- Backend paths under `backend/app/`, frontend paths under `frontend/src/`

## Phase 1: Slice 36 `feat/accounts` — signing in as a person (US1) 🎯

**Goal**: people exist; an upgraded instance opens as `admin` with everything it had.

- [x] T001 [P] [US1] Migration with `users`, `sessions`; `domain/accounts.py` scrypt hash and verify, username rules, per-username limiter. Tests
- [x] T002 [US1] `domain/sessions.py` start, resolve with 30 s cache, end, end all; `api/gate.py` puts the person on the request. Tests: expiry, revoke, disabled person
- [x] T003 [US1] `domain/upgrade.py`: bootstrap `admin` from `DRAWHL_PASSWORD` or `data/password`; log once when the variable is set but unused. Test against a v2026.10.9 database fixture with boards and a token
- [x] T004 [US1] API: login with username, status with `me`, logout-all, `PATCH /me`, `PUT /me/password`. Tests
- [x] T005 [US1] Frontend: username field on sign-in, Settings → My account (name, username, password, sign out everywhere). Tests
- [x] T006 [US1] `conftest.py`, `scripts/smoke.py`, README, guide (security, quick start), `CHANGELOG.md`; screenshot

**Checkpoint**: `make check`, `make smoke`, upgrade fixture → G3.

## Phase 2: Slice 37 `feat/settings` — a settings window (US5)

**Goal**: one window with sections replaces the side sheet, so People, My tracker and later sections have room.

- [x] T007 [US5] `DESIGN.md`: settings window entry (size, sidebar, groups, narrow screens); `/hallmark` pass before code
- [x] T008 [US5] `SettingsDialog.tsx` on shadcn `Dialog`: sidebar with "Account" (Profile, Security, Preferences) and "Instance" (Task source) groups, one section on the right, `?settings=<section>` in the URL, Esc closes, Back and Forward move between sections. Tests
- [x] T009 [US5] Move the forms out of `SettingsSheet.tsx` into sections: Profile (name, username), Security (password, sign out everywhere), Preferences (theme, paste as), Task source (provider, Jira, refresh interval); delete the sheet. Tests
- [x] T010 [US5] Main menu: a header with the person's name and username, "Settings" with `⌘,`, "Sign out" at the bottom; commands "Open settings", "Change password" in the palette. Tests
- [x] T011 [US5] Under 720px wide the window fills the screen and the sidebar turns into a section list that opens each section; docs (guide pages that say "Settings"); `CHANGELOG.md`; screenshot

**Checkpoint**: `make check`, both themes, narrow window → G3.

## Phase 3: Slice 38 `feat/people` — the admin brings people in (US2)

- [x] T012 [P] [US2] Migration `invites`; `domain/invites.py` create, open, accept, revoke for invite and reset. Tests: once, expiry, hash only
- [x] T013 [US2] API `people`, `invites`, reset; last-admin guard. Tests
- [x] T014 [US2] Frontend: `AcceptInvite.tsx` for `?invite=` and `?reset=`; Settings → People section (list, invite with role, copy link, disable, make admin, reset, revoke). Tests
- [x] T015 [US2] `python -m app.reset_password <username>` in the api container prints a one-time reset link, so a locked-out only admin gets back in without SQL. Test
- [x] T016 [US2] Smoke: create, open and revoke an invite; docs; screenshot. The welcome board per person moves to T017, where boards get owners

**Checkpoint**: keep "Invite" behind the admin until slice 40 if releasing in between (see plan).

## Phase 4: Slice 39 `feat/sharing` — sharing a board (US3)

- [x] T017 [P] [US3] Welcome board per person, owned by them (US3 scenario 8). Migration `board_members`, `boards.everyone_role`; owners from the upgrade; `domain/members.py` effective role and `require`. Tests
- [x] T018 [US3] Every board route through `board_role(min_role)`; 404 for no role; admin "All boards". Access matrix test over every board route
- [x] T019 [US3] API members, everyone, transfer, `people/directory`. Tests
- [x] T020 [US3] Frontend: Share dialog in the top bar; "View only" badge and read-only canvas (toolbar, drag, paste, undo, module controls, timers); 403 on save turns the board read-only. Tests
- [x] T021 [US3] Smoke: owner, members and everyone on a scratch board (the viewer's 403 is in the access matrix, so a run adds no person); docs; screenshot

## Phase 5: Slice 40 `feat/my-tracker` — a tracker token per person (US4)

- [x] T022 [P] [US4] Migration `user_credentials`, `task_snapshots_v2`; move the instance token and snapshots to `admin`. Upgrade test
- [x] T023 [US4] Provider per request from instance settings and the person's token; refresh and snapshots keyed by person; `forbidden` and `no_token` task states. Tests with a fake Jira that answers per token: no task data crosses people
- [x] T024 [US4] API `/me/tracker`; `PUT /settings` admin only; Jira URL change marks tokens to test again. Tests
- [x] T025 [US4] Frontend: Settings → My tracker section; Instance group shown only to admins; locked card for `forbidden` and `no_token`. Tests
- [x] T026 [US4] Token-leak test extended to per-person snapshots; docs (Jira guide); `CHANGELOG.md`; screenshot

**Checkpoint**: `make check`, `make smoke`, access matrix, per-token test → G3 → release.
