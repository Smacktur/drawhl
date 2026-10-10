---
description: "Task list for Demo accounts"
---

# Tasks: Demo accounts

**Input**: [spec.md](spec.md), [plan.md](plan.md), [data-model.md](data-model.md), [contracts/api.md](contracts/api.md)

**Tests**: included in every slice; screenshots with made-up data only.

## Format: `[ID] [P?] [Story] Description`

- Backend paths under `backend/app/`, frontend paths under `frontend/src/`

## Phase 1: Slice `feat/demo-sandbox` — try tiko in one click (US1) 🎯

**Goal**: with `TIKO_DEMO=1` a visitor gets a board of their own in one click, alone on it, for 7 days.

- [ ] T001 [P] [US1] `config.py`: `tiko_demo`; the start is refused with `TIKO_TRACKER=jira`; the provider is `demo` and locked on a demo instance; `GET /auth/status` gains `demo`. `.env.example`, README. Tests: off by default, nothing changes
- [ ] T002 [P] [US1] Migration `010_demo.sql`; `Person.demo_expires_at`; `UserRepo`: add a demo visitor, touch, count alive, delete expired with everything of theirs in one transaction. Tests: no row in any table names a deleted visitor (SC-005)
- [ ] T003 [US1] `domain/demo.py`: `DemoVisitors` (create under the address and instance limits, an IPv6 /64 as one address, eviction of untouched visitors at the cap, cleanup); `Sessions.resolve` refuses an expired visitor and moves the expiry at most once a minute. Tests with a set clock: limits, expiry of an hour and of 7 days, 500 untouched visitors do not keep the next one out, touch, a visitor cannot sign in by password
- [ ] T004 [US1] `POST /auth/demo` and the gate; `me` with `demo_expires_at`; the client address from `X-Real-IP`; `nginx.conf.template` with `real_ip` for private networks. Tests: 404 with the switch off, a session in hand creates nobody, 429 for both limits, a forged `X-Forwarded-For` from outside is ignored (on the compose stack)
- [ ] T005 [US1] `NotDemoVisitor` on the routes of the contract; no "everyone" role and no tracker token on a demo instance; three boards per person; people, directory and counts without demo visitors; `SqliteBoardRepo.listing` filtered in SQL, an admin's other boards without visitors' boards. Tests: access matrix with two demo visitors over every route and the socket (SC-004), the board limit, 1500 boards listed within 100 ms (SC-006)
- [ ] T006 [US1] Cleanup at start and every 10 minutes in the lifespan; sockets of deleted visitors closed through the live port. Tests: an open socket closes, a second run finds nothing
- [ ] T007 [US1] Statuses per person: `demo_statuses`, `DemoTaskProvider` scoped by owner, `deps._owner` by person on a demo instance, guest routes with the board owner's statuses. Tests: two people, one changes a status; an ordinary instance still shares; a guest sees the owner's; statuses survive a restart
- [ ] T008 [P] [US1] `api/auth.ts` with the demo fields and `startDemo`; on a demo instance `SignIn.tsx` opens on "Try the demo" with the sign-in form behind "Already have an account? Sign in"; the two 429 messages. Tests; `/ui-review`
- [ ] T009 [US1] `board/DemoBar.tsx` with the time left ("Sign up to keep it" joins it in slice 2); no Share, Security and My tracker for a demo visitor; sign-out asks first; the board limit message in `NewBoardForm`. Tests; `/ui-review`
- [ ] T010 [US1] Check on the compose stack with `TIKO_DEMO=1`: two clean browsers get separate boards and separate statuses, one click to an editable board under 3 s (SC-001), an expiry set into the past and a cleanup remove the visitor; with the switch off `make check` and `make smoke` pass unchanged (SC-003)
- [ ] T011 [US1] Guide (`TIKO_DEMO` in Configuration, "Running a demo"), `DESIGN.md` for the bar, `CHANGELOG.md`

## Phase 2: Slice `feat/demo-signup` — keep the work by signing up (US2)

**Goal**: a demo visitor becomes a regular member without losing anything.

- [ ] T012 [US2] `DemoVisitors.sign_up` in place and `POST /auth/signup`; sockets recheck the person. Tests: same ids, content and versions of the boards before and after (SC-002), errors as an invite gives, 404 for a member and with the switch off, the race with the cleanup and with a touch, the cleanup leaves a signed-up person alone, the public link and sharing work after sign-up, three boards still
- [ ] T013 [P] [US2] `GET /people/directory` on a demo instance: an exact username or nobody. Tests
- [ ] T014 [US2] `auth/SignUp.tsx` opened from the bar: name, username, password; the bar goes without a reload, and in a second tab on its next request. Tests; `/ui-review`
- [ ] T015 [US2] Check on the compose stack: sign up, sign in from another browser, both boards and a changed status are there, a public link opens in a clean browser; `make check`
- [ ] T016 [US2] Guide ("Running a demo": sign-up, limits), `CHANGELOG.md`
