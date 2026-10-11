---
description: "Task list for Demo visitor"
---

# Tasks: Demo visitor

**Input**: [spec.md](spec.md), [plan.md](plan.md), [contracts/api.md](contracts/api.md)

**Tests**: included in every slice; screenshots with made-up data only.

## Format: `[ID] [P?] [Story] Description`

- Backend paths under `backend/app/`, frontend paths under `frontend/src/`

## Phase 1: Slice `feat/demo-visitor` — the limits follow the visitor (US1) 🎯

**Goal**: an instance with a tracker takes demo visitors; a visitor who signs up connects their tracker.

- [x] T001 [US1] `config.py`, `main.py`: `TIKO_DEMO` starts with `TIKO_TRACKER=jira` and locks nothing. Test
- [x] T002 [US1] `api/deps.py`: `tracker`, used by `providers`, `provider`, the board view and the refresh. Tests on an instance set to Jira: a visitor resolves demo keys only, syncs the demo source only
- [x] T003 [US1] `api/settings.py`, `api/me.py`: a visitor's settings and tracker answers; `PUT /me/tracker` and `POST /settings/jira/test` refuse a visitor; the test route refuses an address from a member. Tests, the Jira address never in a visitor's answer
- [x] T004 [US1] `TIKO_BOARD_LIMIT` and `check_board_limit`. Tests: members held, a visitor at three, admins free, no limit without the variable
- [x] T005 [US1] The welcome note by person. Test
- [x] T006 [US1] Check on the compose stack with `TIKO_DEMO=1` and Jira set: a visitor's Settings and card tool, sign-up, My tracker; `make check`
- [x] T007 [US1] Guide ("Running a demo", Configuration), `.env.example`, `CHANGELOG.md`

## Phase 2: Slice `feat/demo-entry` — the demo at its own address (US2)

- [ ] T008 [US2] The first screen of an open instance: the sign-in form with a link to `/demo`; `/demo` with the button; nginx serves the page. Tests
- [ ] T009 [US2] Guide, `DESIGN.md`, `CHANGELOG.md`; check on the compose stack in both themes
