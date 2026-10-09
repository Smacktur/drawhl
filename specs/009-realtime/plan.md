# Implementation Plan: Real-time boards (skeleton)

**Spec**: [spec.md](spec.md) | **Status**: skeleton, to be filled before G2

## Starting points in the code

```text
backend/app/api/gate.py            PasswordGate already closes sockets without a session (1008)
backend/app/domain/members.py      Members.require: the one role check, reuse for sockets
backend/app/domain/sessions.py     sessions cache 30 s; needs a hook to kick open sockets
backend/app/domain/boards.py       BoardDoc, check_doc, task_keys, MAX_NODES
backend/app/adapters/storage/sqlite.py   boards.doc JSON + version; one connection behind a lock
frontend/src/canvas/useBoardDoc.ts debounced CAS saves; the place the CRDT provider replaces
frontend/src/canvas/useHistory.ts  local undo; becomes Y.UndoManager
frontend/src/canvas/Canvas.tsx     xyflow nodes and edges, read-only wiring, conflict banner
frontend/nginx.conf.template       needs WebSocket upgrade headers and a longer read timeout
frontend/vite.config.ts            dev proxy needs ws: true
```

## Shape to evaluate (not decided)

- `GET /api/boards/{id}/live` WebSocket, y-websocket protocol through `pycrdt-websocket`; one room per board in memory, created on first join, persisted debounced to `boards.doc` (JSON) and dropped after the last person leaves.
- Board content in a `Y.Doc`: `nodes` and `edges` as `Y.Map` by id, each node's fields in a nested `Y.Map`; text of stickies, texts and frame titles as `Y.Text` if character-level merging is wanted.
- Presence through the awareness protocol: user id, name, color, cursor in flow coordinates, selected ids.
- Viewport out of the shared doc.

## Slices (draft, to confirm)

| # | Branch | Story | Done when |
|---|---|---|---|
| 42 | `feat/live-sync` | US1 | two browsers edit one board and converge; viewer updates are dropped by the server; no task data in the socket |
| 43 | `feat/presence` | US2 | faces in the top bar, named cursors, remote selection |
| 44 | `feat/live-undo` | US3 | undo only reverts the person's own changes |
| 45 | `feat/reconnect` | US4 | offline edits merge on reconnect; revoked people are kicked |

## Risks (draft)

| Risk | Plan B |
|---|---|
| Merged docs break `check_doc` rules | Repair on persist (drop dangling edges, re-order parents) and log it |
| Memory of rooms on big boards | Cap people per room and update size; drop idle rooms |
| xyflow re-renders on every remote update | Batch remote updates per animation frame |
| A per-person snapshot leaks through the doc | Keep task data out of the Y.Doc by schema; a test checks socket traffic |

## Lessons from spec 008 to reuse

- Gate every board route and socket through one domain function; test with an access matrix.
- Library docs come from context7; new dependencies go through `make licenses` and `THIRD_PARTY.md`.
- Release tags are `vYYYY.M.N`, images are tagged `YYYY.M.N` without the `v`.
- The CLA bot sometimes posts no status on a PR; opening `https://cla-assistant.io/check/tiko-run/tiko?pullRequest=<n>` makes it check again.
