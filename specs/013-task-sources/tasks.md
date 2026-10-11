---
description: "Task list for Task sources"
---

# Tasks: Task sources

**Input**: [spec.md](spec.md), [plan.md](plan.md), [data-model.md](data-model.md), [contracts/api.md](contracts/api.md)

**Tests**: included in every slice; screenshots with made-up data only.

## Format: `[ID] [P?] [Story] Description`

- Backend paths under `backend/app/`, frontend paths under `frontend/src/`

## Phase 1: Slice `feat/task-sources` — tasks of two sources on one board (US1) 🎯

**Goal**: a task knows its source, and demo tasks stay live next to Jira.

- [x] T001 [US1] `docs/brief.md`: several trackers at once leave Won't
- [x] T002 [P] [US1] `domain/tasks.py`: `Task.source`, `task_ref` and `split_ref`; the Jira and demo providers and `NoTokenProvider` set it. Tests
- [x] T003 [P] [US1] Migration `011_sources.sql` (each person's cache carried over); `SnapshotRepo` reads and writes by ref. Tests: same key in two sources, two people
- [x] T004 [US1] `domain/boards.py` and `domain/modules/`: optional `source` on cards, timer watches and Gantt task rows; `task_refs` with the instance's tracker as the default. Tests: an old document validates and yields the same refs as before
- [x] T005 [US1] `domain/refresh.py`: providers by source id, one poll and one status per source, a failing source leaves the others alone. Tests (SC-003)
- [x] T006 [US1] `api/deps.py`: `providers()`; `api/boards.py`, `api/tasks.py`, `api/public.py` answer task maps by ref; `domain/public.py` decides full or private by source. Tests: two same-key tasks (SC-002), the byte test of spec 012 on a mixed board
- [x] T007 [US1] `domain/welcome.py`: the welcome board carries `source: "demo"`. Test on an instance set to Jira
- [x] T008 [P] [US1] `api/tasks.ts` and `api/boards.ts`: `source` in the schemas; `canvas/tasks-context.ts` and one `taskRef` helper; cards, Gantt, timers, search and clipboard look tasks up by ref and write `source` on what they create. Tests
- [x] T009 [US1] Card and Gantt texts take the tracker's name from the task's source ("Open in …", "Connect your … token"). Tests
- [x] T010 [US1] Checked on the compose stack set to Jira, with Jira unreachable: an old board of 35 cards opens from the carried-over cache with its document unchanged (SC-001); on a board with a demo card and a Jira card of the same key the demo task is live and the sync list reports Jira failing and demo synced (SC-003); a guest sees the demo task in full and the Jira task as a key. The mock Jira runs in the API tests (SC-002). `make check` green
- [x] T011 [US1] Guide (a line on demo tasks next to a tracker), `CHANGELOG.md`

## Phase 2: Slice `feat/source-mark` — see where a task comes from (US2)

**Goal**: a mark on every task of a mixed board.

- [x] T012 [US2] Marks: the Jira icon from Atlassian's own `@atlaskit/logo` package, the tiko emblem for demo; `THIRD_PARTY.md` and `TRADEMARKS.md`; `make licenses`
- [x] T013 [P] [US2] `sources/registry.ts` and `SourceMark.tsx` (14px, theme-aware, a neutral icon for an unknown source). Tests
- [x] T014 [US2] The mark on cards (expanded, collapsed, private, no token) when the board is mixed; it appears and goes as sources come and go. Tests
- [x] T015 [P] [US2] The mark in the mini-card's link button, in the sync list rows and in Gantt task rows. Tests
- [x] T016 [US2] `DESIGN.md`: the card anatomy with the mark, the rule for logos in place of the ban
- [x] T017 [US2] Checked on the compose stack with two scratch boards of made-up tasks, in both themes: on the mixed board every card and Gantt task row starts with its mark (the tiko emblem on demo tasks, the Jira tile on the others), the mini-card button and the sync list carry it; the board with one tracker shows none (SC-004 by the marks being absent; no pixel diff was taken). `/ui-review` is not installed here and was not run. `make check` and `make licenses` green
- [x] T018 [US2] Guide, `CHANGELOG.md`
