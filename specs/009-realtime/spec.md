# Feature Specification: Real-time boards

**Feature Branch**: `009-realtime`

**Created**: 2026-10-09

**Status**: Skeleton. Stories, scope and the decisions below come from the spec 008 session; requirements, contracts and tasks are to be written in the next session, then G2.

**Input**: Team mode step 2 from the roadmap in [spec 008](../008-accounts/spec.md): several people on one board at once, with cursors and presence. G1 for team mode was approved on 2026-10-08; this spec needs G2.

## Why

Spec 008 lets people share a board, but two editors on one board still collide: the second save gets `version_conflict` and the board reloads, dropping that person's last change. Companies that want "Miro inside our network" expect to see each other's cursors and changes live. Real-time is the step that makes sharing feel like a whiteboard and not a file.

## Decided already (spec 008 session)

- **CRDT, not locking or last-writer-wins**: `yjs` in the browser, `pycrdt` and `pycrdt-websocket` on the server. All MIT; run `make licenses` and add them to `THIRD_PARTY.md`.
- **Monolith stays**: one FastAPI process serves WebSockets next to the REST API. The API runs as a single uvicorn process today (`backend/Dockerfile`), so rooms can live in memory. Several API replicas need Redis pub/sub; that belongs to the Postgres and Helm step, not here.
- **Open core**: real-time is AGPL, like accounts and sharing.
- **Works without keys**: no external service; real-time works on a laptop with `docker compose up`.

## User Scenarios (draft)

### User Story 1 - Edits appear for everyone at once (P1)

Ann and Bob open the same board. Ann moves a card, writes on a sticky note, draws an arrow; Bob sees it within a moment, without reloading, and his own edits never get lost. `version_conflict` and its "This board changed in another tab" banner are gone for boards opened live.

### User Story 2 - Who is here and where (P2)

The top bar shows the faces (initials) of people on the board. Each person has a cursor with their name in their color; a node someone else has selected shows their color around it. Viewers count as present but have no editing cursor actions.

### User Story 3 - Undo is mine (P3)

Undo and redo step back only through the person's own changes, never someone else's (`Y.UndoManager` with a local origin), as `⌘Z` works today.

### User Story 4 - Dropped connection (P3)

Wi-Fi drops for a minute: the person keeps working, a quiet "Reconnecting…" shows, and on return their changes merge with what others did meanwhile. A tab left open overnight catches up when it wakes.

## Constraints found in the code (must hold)

- **Task data never travels through the shared document.** Since spec 008 slice 40 every person sees tasks through their own tracker token and their own snapshot cache (`task_snapshots_v2`, keyed by person). The CRDT carries only board content: node ids, positions, sizes, text, card keys, module content. Each client keeps fetching task data itself (`POST /boards/{id}/refresh`). A test must prove no task summary from one person's token reaches another through the socket.
- **Roles are enforced on the server for every update.** A viewer's socket may read and send presence, never document updates; the server drops them, not only the UI. The role check goes through the same `Members.require` as REST (`backend/app/domain/members.py`).
- **Revocation reaches open sockets.** Disabling a person, ending their sessions ("Sign out everywhere", password change) or lowering their board role must close or downgrade their open sockets at once. Today sessions are cached for up to 30 s (`backend/app/domain/sessions.py`); sockets need an explicit kick, not only the cache.
- **The gate already covers WebSockets.** `PasswordGate` (`backend/app/api/gate.py`) closes a socket with code 1008 when there is no session; the cookie is `SameSite=Lax` and same-origin, so the browser sends it with the upgrade.
- **The web proxy does not pass WebSockets yet.** `frontend/nginx.conf.template` proxies `/api/` without `proxy_http_version 1.1`, `Upgrade` and `Connection` headers, and nginx closes idle proxied connections after 60 s (`proxy_read_timeout`). The dev proxy in `frontend/vite.config.ts` needs `ws: true`. Railway and Render pass WebSockets; check that the template still works.
- **The viewport is per person but stored in the shared doc.** `BoardDoc.viewport` is saved with the board (`backend/app/domain/boards.py`, `frontend/src/canvas/useBoardDoc.ts`). Live, one person's pan and zoom must not move everyone's view: keep the viewport out of the CRDT (per person, in the browser or per user on the server). A board opened for the first time still fits its content (`fitView` when `version === 1`).
- **Board rules still hold after a merge.** `check_doc` enforces parent-before-child order, frames and modules not nested, timers after their holder, edges to existing nodes, `MAX_NODES = 2000`. Concurrent edits can break these (one person deletes a frame while another drops a card into it). Decide: repair on the server when persisting, or make the client order-independent.
- **Persistence and REST stay.** `GET /boards/{id}` keeps returning the JSON doc (search, Gantt keys, refresh, smoke and the welcome board use it). The server keeps a JSON snapshot of the CRDT, saved debounced, and the `version` column keeps counting so REST readers notice changes. Decide whether to also store the encoded CRDT state (a new column) or rebuild it from JSON when a room opens.
- **Read-only boards stay read-only.** The viewer canvas from spec 008 (`ReadOnlyContext`, no saves) keeps working; a viewer's client simply never sends updates.
- **Module content is one value per node.** Gantt content is a JSON blob in `node.data.content`; two people editing one Gantt at the same moment resolve last-writer-wins on that node unless the module's content becomes a nested CRDT. Acceptable for v1? Decide.
- **Timers** fire in every open tab of every person present; that is fine (notifications are personal), but a "done" or snooze must sync.
- **Welcome board, sharing, search, paste, clipboard, smart guides** keep working; smart guides and drag previews stay local until the drop.

## Out of scope (draft)

- Several API replicas and Redis (Postgres and Helm spec).
- Comments, mentions, follow-me mode, voice.
- Real-time inside the settings window or the People list.
- Offline-first editing across browser restarts.

## Open questions for the next session

1. Store encoded CRDT state in the database, or rebuild from JSON on room open? (Affects restart cost and history.)
2. Server-side repair of `check_doc` violations after merges, or client-side guarantees?
3. Presence colors: derived from the user id, or picked? Initials only, or avatars later?
4. Gantt and other modules: nested CRDT now, or last-writer-wins per module for v1?
5. What happens to a REST `PUT /boards/{id}` from an old tab while a room is live: reject with a "reload" error, or apply as an update?
6. Limits: people per board, update size and rate, room memory for a 2000-node board.
