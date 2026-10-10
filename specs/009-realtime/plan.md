# Implementation Plan: Real-time boards

**Spec**: [spec.md](spec.md) | **Data**: [data-model.md](data-model.md) | **Contract**: [contracts/live.md](contracts/live.md)

## Summary

A board becomes a `Y.Doc` shared over one WebSocket per board. The server keeps a room per open board in memory, enforces roles per connection, repairs rule violations after merges, and saves the JSON doc and the encoded state together, so every REST reader keeps working. The browser binds xyflow to the document, shows presence from the awareness protocol and keeps the viewport to itself.

## Starting points in the code

```text
backend/app/api/gate.py            PasswordGate puts the person on the socket scope, closes 1008 without a session
backend/app/domain/members.py      Members.require: the one role check, reused for sockets
backend/app/domain/sessions.py     end, end_all, forget: where sockets get kicked
backend/app/domain/boards.py       BoardDoc, check_doc, save_board, MAX_NODES
backend/app/adapters/storage/sqlite.py   boards.doc JSON + version; one connection behind a lock (blocking)
frontend/src/canvas/useBoardDoc.ts debounced CAS saves; replaced by the live binding
frontend/src/canvas/useHistory.ts  snapshot undo; replaced by Y.UndoManager
frontend/src/canvas/Canvas.tsx     xyflow wiring, read-only wiring, conflict banner, fitView on version 1
frontend/nginx.conf.template       /api/ has no upgrade headers, 60 s read timeout
frontend/vite.config.ts            dev proxy needs ws: true
```

## Structure

```text
backend/app/domain/live.py         projection, apply_json, repair; the LiveRooms port (kick person, kick session,
                                   recheck board, close board, apply REST save). Imports pycrdt, no FastAPI
backend/app/adapters/live/rooms.py rooms and connections in memory: role filter, save timer, idle drop
backend/app/api/live.py            the WebSocket route: origin, role, size limit, session re-check
frontend/src/live/                 doc.ts (schema, projection), binding.ts (canvas state and the document),
                                   useLiveBoard.ts (provider, status, undo), viewport.ts, presence.ts
```

`pycrdt` in the domain is a deliberate exception to "no provider SDKs": it is the data structure, not a service, and the repair rules are business logic that must be tested there.

## Decisions

- **The room is written on `pycrdt` directly, without `pycrdt-websocket`.** Its `YRoom.on_message` sees bytes without a sender, and roles must be checked per connection; `pycrdt` already has the sync and awareness messages, so the room is about 200 lines that filter each connection's writes by message type before they reach the document.
- **Storage runs in a worker thread** (`anyio.to_thread`): the SQLite repo is blocking and shares one connection behind a lock.
- **Saves are whole-state**: `ydoc` holds the full encoded state, not an update log. A board is small (2000 nodes), and one row per board keeps backup and restore as they are.
- **`PUT /boards/{id}` calls the room** when one is open and the same `apply_json` on a stored doc when none is, so there is one write path.
- **The first paint comes from `GET /boards/{id}`**, as today, view-only; the canvas turns editable on the first sync. Edits are never accepted into a doc that has not synced once, so nothing can be stranded in a tab.
- **A drag writes the document once, on drop**; positions during the drag travel as presence. This keeps a drag one undo step and keeps update traffic low.
- **Remote changes are applied per animation frame**, and the binding touches only the nodes that changed, so xyflow does not re-render the board on every update.
- **nginx**: `proxy_http_version 1.1`, `Upgrade` and `Connection` headers through a `map`, `proxy_read_timeout 1h`; the provider's awareness heartbeat (every 15 s) keeps the socket busy anyway.

## Slices

| Branch | Story | Done when |
|---|---|---|
| `feat/live-sync` | US1, US3 | two browsers edit one board and converge; a viewer's updates are dropped; no task data on the socket; undo reverts only the person's own steps; boards from v2026.10.13 open live |
| `feat/presence` | US2 | faces in the top bar, named cursors, remote selection and live drags |
| `feat/reconnect` | US4 | offline edits merge on return; revoked people are off the board within a second; the API restarts under open boards |

US3 ships inside the first slice: the snapshot undo of today would roll back other people's work the moment sync is on, so main would not be releasable between them. A minimal kick on sign-out and role change also ships in the first slice (FR-010 server side); the third slice adds the client's handling of each close code and the offline indicator.

No release between `feat/live-sync` and `feat/reconnect` unless the first has passed the access matrix: an editor made viewer must lose write access on the open socket from the first slice on.

## Risks

| Risk | Plan B |
|---|---|
| Merged docs break `check_doc` rules | Server repair after every update; the persisted doc is validated before the write, a failed validation keeps the previous save and logs |
| The Python and TypeScript projections drift | One set of JSON fixtures run by both test suites |
| xyflow re-renders on every remote update | Batch per animation frame, update only changed nodes; measure SC-005 before G3 |
| Room memory on big boards | 30 connections, 1 MiB messages, idle rooms dropped after 30 s |
| A person's task data leaks through the doc | No task field in the schema; SC-004 records socket bytes |
| Self-hosters' own proxies block WebSockets | View-only with a clear notice; "Breaking" in `CHANGELOG.md`; proxy snippets for nginx, Caddy and Traefik in the guide |
| pycrdt objects must be freed on the thread that made them | Rooms live on the event loop only; storage threads get plain bytes; a room frees its document when it stops |
| Encoded state grows with deletions | Garbage collection stays on; SC-005 measures a board after 10 000 edits |

## Lessons from spec 008 to reuse

- Gate every board route and socket through one domain function; test with an access matrix.
- Library docs come from context7; new dependencies go through `make licenses` and `THIRD_PARTY.md`.
- A user-visible slice updates the guide in `docs/guide`.
