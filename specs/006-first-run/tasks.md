---
description: "Task list for First run and polish"
---

# Tasks: First run and polish

**Input**: [spec.md](spec.md), [plan.md](plan.md)

**Tests**: included: welcome doc and seed rules in pytest; fit steps, paste and the setting in vitest; screenshot per slice.

## Format: `[ID] [P?] [Story] Description`

- Backend paths under `backend/app/`, frontend paths under `frontend/src/`

## Phase 1: Slice 26 `feat/welcome-board` — a board to start from (US1) 🎯

**Goal**: a fresh install opens on a board that shows tiko.

**Independent Test**: see US1 in [spec.md](spec.md).

- [x] T001 [P] [US1] `domain/welcome.py`: `welcome_doc(today)` with frames, notes, DEMO cards, arrows, Gantt with milestone and dependency, timer. Tests: passes `check_doc`, dates from today, demo keys only
- [x] T002 [US1] `domain/boards.py` `list_boards`: seed once on an empty never-seeded database, flag on upgrade, one board under concurrent calls; `api/boards.py` uses it. Tests
- [x] T003 [US1] Frontend: fit the view when a board opens at version 1 (never saved). Tests
- [x] T004 [US1] `CHANGELOG.md`, README quick start; screenshot of a fresh install in light and dark

**Checkpoint**: `make check`, screenshot → G3.

## Phase 2: Slice 27 `feat/sticky-fit` — sticky text fits the note (US2)

- [x] T005 [P] [US2] `canvas/fit.ts`: largest font size from 14 px down that fits, no lower bound. Tests
- [x] T006 [US2] `StickyNode.tsx`: fit on text and size change, 2000 character limit with the "no entry" flash. Tests
- [x] T007 [US2] `DESIGN.md`, `CHANGELOG.md`; screenshot

**Checkpoint**: `make check`, screenshot → G3.

## Phase 3: Slice 28 `feat/scrollbars` — scrollbars in the app's style (US3)

- [x] T008 [US3] `index.css`: thin themed scrollbars for Firefox and Chromium in both themes; check shortcuts, timer list, JQL suggestions, search, settings
- [x] T009 [US3] `DESIGN.md`, `CHANGELOG.md`; screenshot

**Checkpoint**: `make check`, screenshot → G3.

## Phase 4: Slice 29 `feat/paste-text` — paste text and task links onto the board (US4)

- [x] T010 [P] [US4] `canvas/paste.ts`: ordered steps (tiko elements by clipboard marker, task keys and links to cards, plain text to a text or sticky node), ignore editable targets. Tests
- [x] T011 [US4] Canvas wires the native `paste` event; "Paste text as" in Settings, stored in `localStorage`. Tests
- [x] T012 [US4] `CHANGELOG.md`, README; screenshot

**Checkpoint**: `make check`, screenshot → G3.

## After the slices

- [x] T013 Run the core scenario through `/gstack-qa` and `/gstack-design-review` on a fresh install; fix what they find in `fix/` branches. US1–US4 passed in light and dark; one fix (Redo shortcut label `CTRL Y`), the rest low and deferred
