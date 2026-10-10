---
description: "Task list for Real-time boards"
---

# Tasks: Real-time boards

**Input**: [spec.md](spec.md), [plan.md](plan.md), [data-model.md](data-model.md), [contracts/live.md](contracts/live.md)

**Tests**: included in every slice; screenshots with made-up data only.

## Format: `[ID] [P?] [Story] Description`

- Backend paths under `backend/app/`, frontend paths under `frontend/src/`

## Phase 1: Slice `feat/live-sync` — edits appear for everyone (US1, US3) 🎯

**Goal**: two people edit one board and converge; roles hold on the socket; undo is personal.

- [x] T001 [P] [US1] Add `pycrdt`, `yjs`, `y-websocket`, `y-protocols`; `make licenses`, `THIRD_PARTY.md`. Migration `008_live.sql` (`boards.ydoc`); repo reads and writes `doc`, `ydoc` and `version` in one statement. Tests
- [x] T002 [P] [US1] `domain/live.py`: document schema, projection to `BoardDoc`, `apply_json`. Shared JSON fixtures in `frontend/src/live/projection.fixtures.json`; tests: round trip of every node type, the welcome board, parent order, stacking order
- [x] T003 [US1] `domain/live.py` repair: every row of the table in data-model.md, with the server's origin; the result passes `BoardDoc` and `check_doc`. Tests per rule and a property test over random concurrent edits
- [x] T004 [US1] `adapters/live/rooms.py`: room per board on first join (from `ydoc`, else `apply_json`), save after 2 s idle and every 10 s, on last leave and at shutdown, drop after 30 s; storage in a worker thread. Tests: restart keeps item identity, a v2026.10.13 database fixture opens with identical content
- [x] T005 [US1] `adapters/live/rooms.py` connections and `api/live.py`: origin check, `Members.require`, per-connection role filter by message type, 1 MiB limit, 30 connections, close codes. Socket access matrix test (role × action), forged viewer update, foreign origin
- [x] T006 [US1] `LiveRooms` port wired into `Sessions.end` and `end_all`, people disable and role change, member, everyone, transfer and delete routes: sockets close or re-check within 1 s; session re-check every 60 s. Tests
- [x] T007 [US1] `PUT /boards/{id}` through `apply_json` on the open room or the stored doc; stale version answers `version_conflict`. Tests; `scripts/smoke.py` still green
- [x] T008 [P] [US1] `frontend/nginx.conf.template` upgrade headers and read timeout, `vite.config.ts` `ws: true`; a compose check that a socket through the web container stays open for 2 minutes idle
- [x] T009 [US1] `live/doc.ts` schema and projection against the shared fixtures; `live/binding.ts` and `live/useLiveBoard.ts`: provider, xyflow binding in both directions (per-frame batching, only changed nodes, hidden orphans), first paint from REST then editable on sync, view-only with the notice after 5 s without a socket. Replaces `useBoardDoc.ts`; the conflict banner goes. Tests
- [x] T010 [US1] `live/viewport.ts`: viewport per board in `localStorage`, fit when there is none; the web app stops writing `doc.viewport`. Tests
- [x] T011 [US3] `Y.UndoManager` over nodes and edges with the tab's origin replaces `useHistory.ts`; a drag, a resize and a typing burst are one step each. Tests: two docs in one test, undo touches only its own changes, undo of an overwritten change is a no-op
- [x] T012 [US1] Leak test: record every byte on two people's sockets with a fake Jira that answers per token; no summary appears (SC-004). SC-001 convergence test with two headless clients
- [x] T013 [US1] Timers (done, snooze), modules, paste, clipboard, search jump, welcome board and the read-only canvas checked on the live doc; fixes. Two tabs on one board through nginx, checked by hand with a browser script: each sees the other's drag, text edit, duplicate, delete and undo (no browser test in the repository yet)
- [x] T014 [US1] Guide: a "Working together" page, reverse proxy snippets (nginx, Caddy, Traefik) in configuration, security page (socket auth, roles); README; `CHANGELOG.md` with the "Breaking" note on WebSockets; screenshot

**Checkpoint**: `make check`, `make smoke`, socket access matrix, leak test, upgrade fixture, SC-002 measured → G3.

## Phase 2: Slice `feat/presence` — who is here and where (US2)

**Goal**: people see each other's faces, cursors, selection and drags.

- [ ] T015 [US2] `DESIGN.md`: presence entry (8 palette tokens for both themes with contrast for the name label, cursor, selection outline, faces in the top bar, reduced motion); `/hallmark` pass before code
- [ ] T016 [P] [US2] `live/presence.ts`: awareness state per contracts/live.md, color from the person's id, cursor throttled to 50 ms and cleared off-canvas, selection capped at 200 ids. Tests
- [ ] T017 [US2] Faces in the top bar: up to 5 and "+N", names on hover, one face per person across tabs, the person themselves left out. Tests
- [ ] T018 [US2] Remote cursors layer in flow coordinates, outside xyflow's node tree, each with the person's small avatar (the same component as in the top bar; full name on hover and for 2 s after joining); remote selection outline with the avatar on its corner, drawn inside the node so it cannot lag behind it. Tests at several zoom levels
- [ ] T026 [US2] Changes made by others glide into place instead of jumping: a short transition on position and size for remote updates only, off under `prefers-reduced-motion`; a person's own changes stay instant. Tests
- [ ] T019 [US2] Live drags: positions in presence during a drag, the document written once on drop; a remote drag moves the node without entering undo. Tests
- [ ] T020 [US2] SC-005 measured (2000 nodes, 10 clients, 20 dragged elements); `/ui-review`; guide; `CHANGELOG.md`; screenshot in both themes

**Checkpoint**: `make check`, both themes, reduced motion → G3.

## Phase 3: Slice `feat/reconnect` — dropped connection (US4)

**Goal**: a blip costs nothing; a revoked person is off the board at once on their own screen.

- [ ] T021 [US4] Connection status in the save indicator: "Reconnecting…", after 30 s "Not saved yet. Changes are kept in this tab."; `beforeunload` while local updates are unconfirmed. Tests
- [ ] T022 [US4] Close codes on the client: 4401 and 1008 to sign-in, 4403 re-reads the board (view-only, editor again, or back to the list with the notice), 4429 view-only with a retry every 30 s, 1009 reloads. Tests per code
- [ ] T023 [US4] Offline merge test: two clients, one disconnected, both edit, reconnect, identical docs with no duplicates; a tab resumed after the room was dropped and after an API restart
- [ ] T024 [US4] Graceful shutdown: rooms save and close sockets with 1012 in the app lifespan; compose restart under an open board loses nothing older than 2 s. Test
- [ ] T025 [US4] QA of spec 009 on a fresh install and on an upgraded v2026.10.13 volume, two people and a viewer, both themes; Railway and Render templates pass WebSockets; guide; `CHANGELOG.md`

**Checkpoint**: `make check`, `make smoke`, QA → G3 → release.
