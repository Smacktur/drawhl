---
description: "Task list for Focus timer and music"
---

# Tasks: Focus timer and music

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md)

**Tests**: included: state machine and colors in vitest, capsule component test, screenshot per slice.

## Format: `[ID] [P?] [Story] Description`

- Frontend paths under `frontend/src/`

## Phase 1: Slice 15 `feat/focus-timer` — focus timer (US1) 🎯

**Goal**: rounds of focus and breaks from a capsule at the top center.

**Independent Test**: see US1 in [spec.md](spec.md).

- [x] T001 [P] [US1] `focus/timer.ts`: settings with clamping, state machine (start, pause, resume, reset, skip, finish on time, auto start, long break every N rounds), view (remaining, progress, round). Tests in `focus/timer.test.ts`
- [x] T002 [P] [US1] `focus/tone.ts`: hue and chroma by state and progress. Tests
- [x] T003 [US1] `focus/store.ts` and `focus/alerts.ts`: `localStorage` persistence, 1 s ticker from the end time, chime and notification at the end of a phase (depends on T001)
- [x] T004 [US1] `focus/FocusCapsule.tsx`: dial with state icon and tooltip, digits, round dots, play button, drifting gradient; player row with the settings button; mounted in `App.tsx`; "Show focus timer" in the main menu. Tests (depends on T002, T003)
- [x] T005 [US1] `focus/FocusSettings.tsx`: popover centered under the capsule with a slide-in, Timer tab with steppers and toggles
- [x] T006 [US1] `DESIGN.md`, `CHANGELOG.md`, README feature list; screenshot in light and dark

**Checkpoint**: `make check`, screenshot → G3.

## Phase 2: Slice 16 `feat/focus-music` — background music (US2)

**Goal**: lofi under the timer.

**Independent Test**: see US2 in [spec.md](spec.md).

- [x] T007 [P] [US2] Re-encode 7 CC0 tracks to MP3 112 kbps into `frontend/public/music/`; `THIRD_PARTY.md` credits; the large-file hook skips that folder
- [x] T008 [US2] `focus/music.ts`: playlist, play, pause, next, pick, volume, local files as object URLs, pause on breaks. Tests
- [x] T009 [US2] Player row in the capsule and the Music tab in settings (depends on T008)
- [x] T010 [US2] `DESIGN.md`, `CHANGELOG.md`, README; screenshot

**Checkpoint**: `make check`, screenshot → G3.

## Phase 3: Slice 17 `feat/focus-own-tracks` — own tracks survive a reload (US2)

**Goal**: files added from disk stay in the browser until removed.

**Independent Test**: add two audio files, reload: both are in the list and the last picked one is current; remove one, reload: it is gone.

- [x] T011 [P] [US2] `focus/library.ts`: IndexedDB store `tracks` with list, save, remove. Tests in `focus/library.test.ts` with `fake-indexeddb`
- [x] T012 [US2] `focus/music.ts`: save added files, restore them on start, remember the current track by key, read an own track's length when it plays, remove a track; remove button on own tracks in the Music tab. Tests (depends on T011)
- [x] T013 [US2] Spec, `DESIGN.md`, `CHANGELOG.md`, `THIRD_PARTY.md`; check in the running stack

**Checkpoint**: `make check`, check in the running stack → G3.
