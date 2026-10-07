---
description: "Task list for Search on the board"
---

# Tasks: Search on the board

**Input**: [spec.md](spec.md), [plan.md](plan.md)

**Tests**: included: index, matcher, layout fallback, ranking, filters, commands and the palette in vitest; screenshot per slice.

## Format: `[ID] [P?] [Story] Description`

- Frontend paths under `frontend/src/`

## Phase 1: Slice 22 `feat/search` — find anything and jump to it (US1) 🎯

**Goal**: `⌘K`, type, Enter, you are there.

**Independent Test**: see US1 in [spec.md](spec.md).

- [x] T001 [P] [US1] `search/index.ts`: entries for every node kind, Gantt rows and milestones, context and jump target. Tests
- [x] T002 [P] [US1] `search/match.ts`, `search/layout.ts`: normalize, multi-word match, rank, highlight ranges, snippet, layout fallback. Tests
- [x] T003 [US1] (modules list their texts through `ModuleDef.searchable`) `canvas/fly.ts`: `flyTo` moved from timers, fit for big elements, flash for any node. Tests
- [x] T004 [US1] `search/SearchPalette.tsx`, `BoardSearch.tsx`, `palette.ts`, `recent.ts`: dialog, results, keyboard, jump and select, recent and frames on empty input; `⌘K` and `⌘F` in the shortcut registry, "Search" in the main menu. Tests
- [x] T005 [US1] `DESIGN.md`, `CHANGELOG.md`, README; screenshot in light and dark

**Checkpoint**: `make check`, screenshot → G3.

## Phase 2: Slice 23 `feat/search-preview` — preview and highlight (US2)

- [x] T006 [US2] (the preview centers the element under the palette, not behind it; no backdrop) Preview on keyboard pick, viewport restore on cancel. Tests
- [x] T007 [US2] Matches ringed and the rest faded on the canvas; `⌘Enter` and "Select all N" select matches and fit them. Tests
- [x] T008 [US2] `DESIGN.md`, `CHANGELOG.md`; screenshot

**Checkpoint**: `make check`, screenshot → G3.

## Phase 3: Slice 24 `feat/search-filters` — filters (US3)

- [x] T009 [US3] (suggestion counts follow the chips; filters match Gantt task rows too) `search/query.ts`: parse `@`, `status:`, `type:`, `priority:`, `#`; value suggestions with counts. Tests
- [x] T010 [US3] Chips in the input, Tab to insert, Backspace to edit. Tests
- [x] T011 [US3] `DESIGN.md`, `CHANGELOG.md`; screenshot

**Checkpoint**: `make check`, screenshot → G3.

## Phase 4: Slice 25 `feat/search-commands` — commands and boards (US4)

- [x] T012 [US4] (the toolbar and top bar register their own commands with `useCommands`; Enter and Cmd+Enter use the live text, not the deferred list) `search/commands.ts`: commands with shortcuts wired to the toolbar, top bar and panels; other boards by name; `>` prefix. Tests
- [x] T013 [US4] `DESIGN.md`, `CHANGELOG.md`, README; screenshot

**Checkpoint**: `make check`, screenshot → G3.
