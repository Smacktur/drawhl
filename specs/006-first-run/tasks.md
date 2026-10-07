---
description: "Task list for First run and polish"
---

# Tasks: First run and polish

**Input**: [spec.md](spec.md), [plan.md](plan.md)

**Tests**: included: welcome doc and seed rules in pytest; fit steps, paste and the setting in vitest; screenshot per slice.

## Format: `[ID] [P?] [Story] Description`

- Backend paths under `backend/app/`, frontend paths under `frontend/src/`

## Phase 1: Slice 26 `feat/welcome-board` — a board to start from (US1) 🎯

**Goal**: a fresh install opens on a board that shows drawhl.

**Independent Test**: see US1 in [spec.md](spec.md).

- [ ] T001 [P] [US1] `domain/welcome.py`: `welcome_doc(today)` with frames, notes, DEMO cards, arrows, Gantt with milestone and dependency, timer. Tests: passes `check_doc`, dates from today, demo keys only
- [ ] T002 [US1] `domain/boards.py` `list_boards`: seed once on an empty never-seeded database, flag on upgrade, one board under concurrent calls; `api/boards.py` uses it. Tests
- [ ] T003 [US1] Frontend: fit the view when a board opens at version 1 (never saved). Tests
- [ ] T004 [US1] `CHANGELOG.md`, README quick start; screenshot of a fresh install in light and dark

**Checkpoint**: `make check`, screenshot → G3.

## Phase 2: Slice 27 `feat/sticky-fit` — sticky text fits the note (US2)

- [ ] T005 [P] [US2] `canvas/fit.ts`: largest step from 16 to 10 px that fits. Tests
- [ ] T006 [US2] `StickyNode.tsx`: fit on text and size change, fade over the minimum, scroll while editing. Tests
- [ ] T007 [US2] `DESIGN.md`, `CHANGELOG.md`; screenshot

**Checkpoint**: `make check`, screenshot → G3.

## Phase 3: Slice 28 `feat/scrollbars` — scrollbars in the app's style (US3)

- [ ] T008 [US3] `index.css`: thin themed scrollbars for Firefox and Chromium in both themes; check shortcuts, timer list, JQL suggestions, search, settings
- [ ] T009 [US3] `DESIGN.md`, `CHANGELOG.md`; screenshot

**Checkpoint**: `make check`, screenshot → G3.

## Phase 4: Slice 29 `feat/paste-text` — paste text onto the board (US4)

- [ ] T010 [P] [US4] `canvas/paste.ts`: clipboard marker on copy, outside text to a text or sticky node at the pointer, ignore editable targets. Tests
- [ ] T011 [US4] Canvas wires the native `paste` event; "Paste text as" in Settings, stored in `localStorage`. Tests
- [ ] T012 [US4] `CHANGELOG.md`, README; screenshot

**Checkpoint**: `make check`, screenshot → G3.

## After the slices

- [ ] T013 Run the core scenario through `/gstack-qa` and `/gstack-design-review` on a fresh install; fix what they find in `fix/` branches
