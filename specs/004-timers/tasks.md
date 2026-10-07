---
description: "Task list for Timers on the board"
---

# Tasks: Timers on the board

**Input**: [spec.md](spec.md), [plan.md](plan.md), [contracts/api.md](contracts/api.md)

**Tests**: included: time parsing, state and repeat, attach and delete rules, the cube and the hook in vitest; node type in pytest; screenshot per slice.

## Format: `[ID] [P?] [Story] Description`

- Frontend paths under `frontend/src/`, backend under `backend/app/`

## Phase 1: Slice 19 `feat/timers` — a timer next to a card (US1) 🎯

**Goal**: a cube that counts down, sticks to its element and goes off.

**Independent Test**: see US1 in [spec.md](spec.md).

- [x] T001 [P] [US1] Backend: `TimerNode` in `domain/boards.py`, a timer may nest in any element except an anchor or a timer. Tests in `tests/test_boards.py`
- [x] T002 [P] [US1] `timers/time.ts` and `timers/timer.ts`: parse durations and dates, format time left and the due moment, state, snooze, done. Tests
- [x] T003 [US1] (timers attach left of the element's top edge, not the right corner: that spot stays put when a card collapses) `canvas/frames.ts`: parent chain in `absolute`, timers last in `framesFirst`, frame deletion keeps children's timers; `timers/attach.ts`: attach on drop, stay near the parent, detach; free timers of cards absorbed by a module. Tests
- [x] T004 [US1] `timers/TimerNode.tsx` and `TimerEditor.tsx`: the cube with tooltip, popover with note, input, presets, due line, Done, Delete; Timer tool `R`, "Add timer" in both context menus. Tests (depends on T002, T003)
- [x] T005 [US1] `timers/useTimers.ts`, `alerts.ts`, `TimerNotes.tsx`, `fly.ts`: ticker, notification with click-to-fly, chime, title count, corner notes with Done, +10 min, +1 hour, missed-while-closed note. Tests
- [x] T006 [US1] `DESIGN.md`, `CHANGELOG.md`, README; screenshot in light and dark

**Checkpoint**: `make check`, screenshot → G3.

## Phase 2: Slice 20 `feat/timer-list` — all timers of the board (US2)

**Goal**: see and reach every timer.

**Independent Test**: see US2 in [spec.md](spec.md).

- [ ] T007 [US2] `timers/TimerList.tsx`: button with counts and the next-timer tooltip, non-modal panel with groups, fly and flash on click, Done and +10 min in rows; "Timers" in the main menu. Tests
- [ ] T008 [US2] `DESIGN.md`, `CHANGELOG.md`; screenshot

**Checkpoint**: `make check`, screenshot → G3.

## Phase 3: Slice 21 `feat/timer-triggers` — wait for a status, repeat (US3)

**Goal**: timers that wait for the tracker and timers that repeat.

**Independent Test**: see US3 in [spec.md](spec.md).

- [ ] T009 [US3] `timers/timer.ts`: watch state, going off on a new status, next time of a series. Tests
- [ ] T010 [US3] Editor: "When the status changes" on Jira cards, repeat choice; eye and loop marks on the cube; `useTimers` writes the moment a status timer goes off. Tests
- [ ] T011 [US3] `DESIGN.md`, `CHANGELOG.md`; check against the mock tracker

**Checkpoint**: `make check`, check in the running stack → G3.
