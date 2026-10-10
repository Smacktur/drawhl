# Feature Specification: Real-time boards

**Feature Branch**: `009-realtime`

**Created**: 2026-10-09

**Status**: Approved at G2 on 2026-10-10.

**Input**: Team mode step 2 from the roadmap in [spec 008](../008-accounts/spec.md): several people on one board at once, with cursors and presence. G1 for team mode was approved on 2026-10-08; this spec needs G2.

## Why

Spec 008 lets people share a board, but two editors on one board still collide: the second save gets `version_conflict` and the board reloads, dropping that person's last change. Companies that want "Miro inside our network" expect to see each other's cursors and changes live. Real-time is the step that makes sharing feel like a whiteboard and not a file.

## Decisions

From the spec 008 session:

- **CRDT, not locking or last-writer-wins on the whole board**: `yjs`, `y-websocket` and `y-protocols` in the browser, `pycrdt` on the server (its sync and awareness helpers are enough, so `pycrdt-websocket` is not used). All MIT; run `make licenses` and add them to `THIRD_PARTY.md`.
- **Monolith stays**: one FastAPI process serves WebSockets next to the REST API. The API runs as a single uvicorn process (`backend/Dockerfile`), so rooms live in memory. Several API replicas need Redis pub/sub; that belongs to the Postgres and Helm step.
- **Open core**: real-time is AGPL, like accounts and sharing.
- **Works without keys**: no external service; real-time works on a laptop with `docker compose up`.

Answers to the skeleton's open questions:

1. **The encoded CRDT state is stored** next to the JSON doc (`boards.ydoc`). A room rebuilt from JSON would get new item ids, and a tab that reconnects with edits made offline would then merge into a doc it shares no history with and duplicate every node. Stored state keeps identity across room and server restarts.
2. **The server repairs, clients tolerate.** After every update the server checks the board rules and fixes violations in its own transaction; it is the only repairer, so two clients never fight over a fix. A client hides what it cannot draw (a child whose frame is gone, an arrow to a missing node) until the repair arrives and never writes repairs itself.
3. **Presence color comes from the person's id**, one of 8 theme colors. Initials only; no color picker, no avatars.
4. **One value per field, last writer wins** (confirmed by the owner for v1). A node's place, size, each data field and a module's whole `content` are single values. Ann moving a sticky while Bob retypes it both survive; two people typing in the same sticky, or editing the same Gantt, at the same moment do not merge, the later write wins. Others see who has the node selected, which is the cue to stay out. Character-level text merging and nested module CRDTs are out of scope.
5. **`PUT /boards/{id}` stays and goes through the CRDT.** With a current `version` it is applied to the shared doc as one update, so people on the board see it; with a stale one it answers `version_conflict` as today. The web app stops calling it; smoke, scripts and an old tab keep working.
6. **Limits**: 30 connections per board, 1 MiB per message, 2000 nodes as today. No rate limit in v1: every sender is a signed-in editor of that board.

Decided by the owner on 2026-10-10 (G2):

- **No fallback to REST saving.** When the socket cannot connect, the board is view-only with a notice, and edits are never kept only in a tab that has not synced once. An instance behind its own reverse proxy that does not pass WebSocket upgrades on `/api/` therefore turns read-only after the upgrade until the proxy is fixed. Keeping the old save path alive beside the live one would run every canvas feature on two state engines. The release gets a "Breaking" line in `CHANGELOG.md` and proxy snippets in the guide.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Edits appear for everyone at once (Priority: P1) 🎯

Ann and Bob open the same board. Ann moves a card, writes on a sticky note, draws an arrow; Bob sees it within a moment, without reloading, and his own edits never get lost. The "This board changed in another tab" banner is gone.

**Why this priority**: This is the feature; the rest builds on the shared document.

**Independent Test**: two browsers signed in as two editors open one board. Each adds a sticky and moves the other's card at the same time: both boards converge to the same content within a second, and after both close, `GET /api/boards/{id}` returns it. A third browser signed in as a viewer sees the changes live; an update forged on its socket changes nothing for anyone.

**Acceptance Scenarios**:

1. **Given** two editors on one board, **When** one adds, moves, resizes, edits, connects or deletes elements, **Then** the other sees it within 300 ms on a local network, with no reload.
2. **Given** two editors change different fields of one element at the same moment (one moves it, one edits its text), **Then** both changes stay.
3. **Given** two editors change the same field at the same moment, **Then** both end with the same value, the later write.
4. **Given** one editor deletes a frame while another drops a card into it, **Then** the card stays on the board at the place it was dropped, outside any frame; arrows to deleted elements disappear; a timer attached to a deleted element disappears with it.
5. **Given** a viewer, **Then** they see changes live, and document updates sent on their socket are dropped by the server.
6. **Given** a board with task cards, **Then** no task summary, status or assignee travels through the socket; each person's cards show what their own tracker token allows, as in spec 008.
7. **Given** one person pans or zooms, **Then** nobody else's view moves. The view of a board is remembered per person in their browser; a board with no remembered view opens fitted to its content.
8. **Given** the last person leaves, **Then** `GET /api/boards/{id}` returns the final content within 2 s, and `version` has grown.
9. **Given** a board last saved before this release, **Then** it opens live with the same content, with no manual step.
10. **Given** the socket does not connect within 5 s of opening a board, **Then** the board shows the last saved version, view-only, with "Live connection unavailable. Viewing the last saved version." and keeps trying.
11. **Given** `PUT /api/boards/{id}` with the current version while people are on the board, **Then** they see its content appear; with a stale version it answers 409 `version_conflict`.

---

### User Story 2 - Who is here and where (Priority: P2)

The top bar shows the initials of the people on the board. Each person has a cursor with their name in their color; an element someone else has selected shows their color around it, and an element someone is dragging moves on everyone's screen before it is dropped.

**Why this priority**: Without it people edit the same thing without knowing; with one value per field (decision 4) presence is what keeps them apart.

**Independent Test**: two browsers on one board. Each sees the other's initials in the top bar and a named cursor that follows the mouse; selecting a sticky in one shows a colored outline with the name in the other; closing one tab removes its cursor and face within 3 s.

**Acceptance Scenarios**:

1. **Given** people on a board, **Then** the top bar shows up to 5 faces (initials on the person's color) and "+N" for the rest; hovering shows the names; the person themselves is not listed.
2. **Given** one person with two tabs on the board, **Then** they show as one face and two cursors.
3. **Given** a person moves the mouse over the canvas, **Then** others see a cursor with the name at the same board position at any zoom, updated at most every 50 ms; a cursor that leaves the canvas disappears.
4. **Given** a person selects elements, **Then** others see an outline in that person's color with the name; the person's own selection looks as today.
5. **Given** a person drags elements, **Then** others see them move during the drag; the document changes once, on the drop.
6. **Given** a viewer, **Then** they are shown in the faces and have a cursor; they cannot select for editing, as today.
7. **Given** a tab closes or loses its connection, **Then** its cursor, selection and face are gone for others within 3 s of a clean close and 30 s of a lost connection.
8. **Given** someone else moves or resizes an element, **Then** it glides to its new place in about 150 ms instead of jumping; the person's own changes stay instant.
9. **Given** `prefers-reduced-motion`, **Then** remote cursors, drags and changes jump instead of gliding.

---

### User Story 3 - Undo is mine (Priority: P3)

Undo and redo step back only through the person's own changes, never someone else's.

**Why this priority**: After US1 a snapshot-based undo would roll back other people's work; this must ship in the same release as US1.

**Independent Test**: Ann adds a sticky, Bob moves a card, Ann presses `⌘Z`: Ann's sticky is gone, Bob's card stays where he put it. Ann presses `⇧⌘Z`: the sticky is back.

**Acceptance Scenarios**:

1. **Given** changes by several people, **When** one presses undo, **Then** only their own last step is reverted; redo brings it back.
2. **Given** a drag, a resize or a burst of typing, **Then** each is one undo step, as today.
3. **Given** a person's own change that someone else has since overwritten or deleted, **When** they undo it, **Then** nothing of the other person's is lost and no error shows.
4. **Given** changes made by the server (a repair) or by a REST save, **Then** they are in nobody's undo history.
5. **Given** a board reload, **Then** the undo history starts empty, as today.

---

### User Story 4 - Dropped connection (Priority: P3)

Wi-Fi drops for a minute: the person keeps working, a quiet "Reconnecting…" shows, and on return their changes merge with what others did meanwhile. A person whose access was taken away is off the board at once.

**Why this priority**: Laptops sleep and networks drop; without this every blip costs work. Revocation is the security half of the same socket lifecycle.

**Independent Test**: two editors on a board. One goes offline in devtools, adds a sticky and moves a card; the other adds a sticky. Back online: both boards show both stickies and the moved card within 2 s. Then the owner makes the first a viewer: their canvas turns view-only within a second without a reload; the admin disables them: they land on the sign-in page.

**Acceptance Scenarios**:

1. **Given** a synced board loses its connection, **Then** the person keeps editing, the save indicator reads "Reconnecting…", and after 30 s "Not saved yet. Changes are kept in this tab." shows.
2. **Given** the connection returns, **Then** the tab's changes and everyone else's merge with no duplicates and no lost elements, and the indicator returns to normal.
3. **Given** a tab asleep overnight, **When** it wakes, **Then** it catches up without a reload.
4. **Given** the person closes a tab with changes that never reached the server, **Then** the browser asks before leaving.
5. **Given** a person is disabled, signs out everywhere or changes their password, **Then** their open sockets close within 1 s and the tab goes to sign-in.
6. **Given** a person's role on a board drops to viewer, **Then** within 1 s the server stops taking their updates and the canvas turns view-only with the spec 008 notice; raised back to editor, they can edit again without a reload.
7. **Given** a person loses access to a board, or the board is deleted, **Then** within 1 s they are back on the board list with "You no longer have access to this board."
8. **Given** a session that expires while a board is open, **Then** the socket closes within 60 s.
9. **Given** the API restarts, **Then** open boards reconnect on their own and no change that reached the server more than 2 s before the stop is lost.

### Edge Cases

- A 31st connection to a board: the board opens view-only from the last saved version with "This board is full right now."
- A message over 1 MiB: the socket closes with 1009 and the tab reloads the board.
- An update that takes the board over 2000 nodes: the server removes the nodes that update added.
- An update with content the schema refuses (text over the limit, an invalid task key, an unknown type): the server removes or reverts the offending element; a normal client never sends one.
- Two tabs of one person, one offline: they merge like two people.
- A person joins while another is mid-drag: they see the drag from the next presence update.
- Timers: "done" and snooze are document fields and sync; the notification still fires in every open tab of every person present.
- The welcome board, sharing, search, paste, clipboard and smart guides work as before; smart guides and drag previews stay local.
- A name shown on a cursor comes from the sender's client; a signed-in person with access to the board could fake theirs. Accepted for v1.

## Requirements *(mandatory)*

- **FR-001**: One WebSocket endpoint per board, `/api/boards/{id}/live`, speaking the y-websocket protocol ([contracts/live.md](contracts/live.md)).
- **FR-002**: The socket is opened only for a signed-in person whose role on the board is at least viewer, checked through `Members.require`; no role answers like a missing board.
- **FR-003**: The upgrade request's `Origin`, when present, must match the request's host; otherwise the socket is refused.
- **FR-004**: The server drops document updates from a connection whose role is below editor, per connection and before they reach the room; the role is the server's, not the client's claim.
- **FR-005**: The shared document holds only what `BoardDoc` holds, minus the viewport. Task data is never written to it and never sent on the socket.
- **FR-006**: The server validates the merged document after every update against `BoardDoc` and the `check_doc` rules and repairs it ([data-model.md](data-model.md)); what it persists always passes both.
- **FR-007**: The room saves the JSON doc and the encoded state together, at most 2 s after the last update and at least every 10 s while updates keep coming, when the last person leaves and at shutdown; each save bumps `version` and `updated_at`.
- **FR-008**: A room is created on the first join from the stored state, or from the JSON doc when there is none, and dropped 30 s after the last person leaves. Storage calls never block the event loop.
- **FR-009**: `GET /boards/{id}`, refresh, search and smoke keep their contract. `PUT /boards/{id}` is applied through the shared document.
- **FR-010**: Ending a session, disabling a person, changing a board role or the "everyone" role, transferring or deleting a board reaches open sockets through one domain port within 1 s; sockets also re-check their session every 60 s.
- **FR-011**: The viewport is kept per person and board in the browser; `BoardDoc.viewport` stays in the JSON contract and is no longer written by the web app.
- **FR-012**: Presence travels through the awareness protocol only and is never persisted.
- **FR-013**: Undo and redo cover only changes with the tab's own origin.
- **FR-014**: The web proxy passes WebSocket upgrades on `/api/` and keeps idle sockets open; the dev proxy does the same. Compose, Railway and Render keep working with no new variable.
- **FR-015**: No new external service and no new ENV variable; works without keys.

## Success Criteria *(mandatory)*

- **SC-001**: Two editors each make 100 changes to one board in 10 s; both browsers and `GET /boards/{id}` end with identical content.
- **SC-002**: A change reaches another browser on the same network in under 300 ms at the 95th percentile on a 500-node board.
- **SC-003**: The socket access matrix (role × action) passes: no board content reaches a person without a role, and no update from a viewer is applied.
- **SC-004**: A test that records every byte sent on two people's sockets finds no task summary from either person's token.
- **SC-005**: A room for a 2000-node board with 10 people uses under 30 MB of API memory, and the canvas keeps 50 fps while another person drags 20 elements.
- **SC-006**: A database from v2026.10.13 opens every board live with identical content.

## Out of scope

- Several API replicas and Redis (Postgres and Helm spec).
- Character-level merging of text, nested CRDTs inside modules.
- Comments, mentions, follow-me mode, voice, avatars, a color picker.
- Real-time inside the settings window, the People list or the board list.
- Offline-first editing across browser restarts.
- A REST fallback for editing when WebSockets are blocked.
- A version history of boards.
