---
description: "Task list for Live Jira Canvas (MVP)"
---

# Tasks: Live Jira Canvas (MVP)

**Input**: Design documents from `specs/001-live-jira-canvas/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/api.md](contracts/api.md), [quickstart.md](quickstart.md)

**Tests**: included. The spec requires domain unit tests, API tests and an automated token-leak test (SC-006).

**Organization**: phases are the 6 vertical slices from plan.md, in build order. Each slice is one `feat/<slice>` branch and ends with G3. Inside a slice the order follows the recipe in `docs/playbook/03-architecture.md`: domain + tests → port and adapter with mock → API → UI → smoke.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel: disjoint files, no dependency on an unfinished task in the same slice
- **[Story]**: spec user story (US1–US5)
- Backend paths are under `backend/app/` and `backend/tests/`, frontend under `frontend/src/`

## Phase 1: Setup (slice 1 only)

**Purpose**: what slice 1 needs and nothing more. Dependencies and config for later slices are added in those slices.

- [x] T001 Remove the skeleton example: delete `backend/app/domain/greeting.py`, `backend/tests/test_greeting.py`, the `/api/hello` route and schema in `backend/app/api/routes.py`, the hello check in `backend/tests/test_api.py`, the hello checks in `scripts/smoke.py`, and the hello call in `frontend/src/App.tsx` and `frontend/src/App.test.tsx`; keep `router = APIRouter(prefix="/api")` for later includes
- [x] T002 Add `db_path: str = "data/app.db"` to `Settings` in `backend/app/config.py`; add `DB_PATH=data/app.db` with a comment to `.env.example`; confirm `./data` volume mount for the api service in `docker-compose.yml` and `compose.release.yml`
- [x] T003 [P] Add `@xyflow/react` 12 to `frontend/package.json` (`npm install @xyflow/react`), add a line to `THIRD_PARTY.md` (MIT), run `make licenses`
- [x] T004 [P] Create `DESIGN.md` per `docs/playbook/10-design.md` (canvas-first tool: neutral surface, status colors for `new` / `indeterminate` / `done`, card, frame and sticky styles) and apply its tokens to `frontend/src/index.css` (`:root` and `.dark`), including status tokens `--status-new`, `--status-progress`, `--status-done` Done: `DESIGN.md` already existed; tokens applied.

**Checkpoint**: `make check` green with the example removed.

## Phase 2: Slice 1 `feat/card-on-board` — Jira card on a saved board, demo provider (US1) 🎯 MVP

**Goal**: create a board, add a card by key or URL from the demo source, see it after reload exactly where it was.

**Independent Test**: fresh stack, no `.env` secrets: create board → add `DEMO-1` and `https://jira.example.com/browse/DEMO-2` → reload → both cards in the same place with type icon, key, title, status.

### Domain and tests

- [x] T005 [P] [US1] Add domain errors to `backend/app/domain/errors.py`: `VersionConflict` (code `version_conflict`), `InvalidRef` (`invalid_ref`), `HostMismatch` (`host_mismatch`), `TaskNotFound` (`task_not_found`); map them in `_STATUS` in `backend/app/api/errors.py` to 409, 422, 422, 404
- [x] T006 [P] [US1] Create `Task`, `TaskRef` and `parse_ref(ref, base_host)` in `backend/app/domain/tasks.py`: key matches `^[A-Z][A-Z0-9_]+-\d+$` (input upper-cased and trimmed); URL form `…/browse/KEY`; URL host must equal `base_host` else `HostMismatch`; anything else `InvalidRef`. `Task` fields: `key, state ("ok" | "not_found"), summary, status_name, status_category ("new" | "indeterminate" | "done"), type_name, assignee_name | None, priority_name | None, updated | None, url, fetched_at`. Tests in `backend/tests/test_tasks.py`
- [x] T007 [P] [US1] Create the board document model in `backend/app/domain/boards.py`: Pydantic discriminated union by `type` (`jira_card` data `{key, collapsed}`, `frame` `{title}`, `sticky` `{text, color}`, `text` `{text}`), `Edge {id, source, target, sourceHandle?, targetHandle?}`, `viewport {x, y, zoom}`; drop unknown fields (`selected`, `dragging`, `measured`). Rules raising `ValidationFailed`: unique node ids; edge ends exist; `parentId` must point at a `frame`; frames never have `parentId`; children stored after their parent; limits up to 2000 nodes, `text` up to 5000 chars, `title` up to 200 chars, board `name` 1–100 chars trimmed. Function `card_keys(doc) -> set[str]`. Tests in `backend/tests/test_boards.py`

### Ports and adapters

- [x] T008 [US1] Create `backend/app/domain/ports.py` with `TaskProvider` (`resolve(key) -> Task`, `poll(keys) -> list[Task]` returning missing keys as `state="not_found"`, `check() -> str`, `base_host` property), `BoardRepo` (`list`, `create`, `get`, `save(id, version, doc) -> new_version` raising `VersionConflict` when rowcount is 0, `rename`, `delete`), `SnapshotRepo` (`get_many(keys)`, `put_many(tasks)`) (depends on T006, T007)
- [x] T009 [P] [US1] Create `backend/app/adapters/storage/schema.sql` and `backend/app/adapters/storage/sqlite.py`: one `sqlite3` connection (`check_same_thread=False`) + `threading.Lock`, WAL, migrations by `PRAGMA user_version` applied on startup; tables `boards(id TEXT PK, name, doc TEXT, version INTEGER, created_at, updated_at)` and `task_snapshots(key TEXT PK, state, data TEXT, fetched_at)`; `SqliteBoardRepo` with CAS `UPDATE … WHERE id=? AND version=?`, `SqliteSnapshotRepo`. Tests with `:memory:` in `backend/tests/test_storage.py` Done as numbered files in `backend/app/adapters/storage/migrations/` instead of one `schema.sql`.
- [x] T010 [P] [US1] Create `DemoTaskProvider` in `backend/app/adapters/tasks/demo.py`: 12 made-up tasks `DEMO-1..DEMO-12` on `https://jira.example.com`, mixed types (Bug, Story, Task, Epic), statuses, assignees with invented names, priorities; `base_host = "jira.example.com"`; unknown keys → `TaskNotFound` on resolve and `not_found` on poll; in-memory, deterministic, no network. Tests in `backend/tests/test_demo_provider.py`
- [x] T011 [US1] Create board and task services in `backend/app/domain/boards.py` and `backend/app/domain/tasks.py`: `get_board` returns doc plus snapshots for `card_keys(doc)`; `save_board` validates then CAS-saves; `resolve_task(ref)` parses with the provider's `base_host`, calls `provider.resolve`, stores the snapshot (depends on T008)

### API

- [x] T012 [US1] Create `backend/app/api/boards.py`: `GET /api/boards`, `POST /api/boards` (201), `GET /api/boards/{id}`, `PUT /api/boards/{id}` per [contracts/api.md](contracts/api.md); `backend/app/api/tasks.py`: `POST /api/tasks/resolve {ref}`; include both routers in `backend/app/api/routes.py`; wire `SqliteBoardRepo`, `SqliteSnapshotRepo`, `DemoTaskProvider` in `create_app()` in `backend/app/main.py` via `app.state` + `Depends`; add a DB probe to `/ready` (depends on T009, T010, T011)
- [x] T013 [US1] API tests in `backend/tests/test_api_boards.py`: create → get → save → get round-trip identical; stale `version` → 409 `version_conflict`; frame with `parentId` → 422; resolve by key and by URL; `NOPE-1` → 404 `task_not_found`; `https://other.example.org/browse/DEMO-1` → 422 `host_mismatch`; garbage → 422 `invalid_ref`

### UI

- [x] T014 [P] [US1] Add zod schemas and functions for boards and tasks in `frontend/src/api/boards.ts` and `frontend/src/api/tasks.ts` (reuse the fetch helper in `frontend/src/api/client.ts`)
- [x] T015 [P] [US1] Create `JiraCardNode` in `frontend/src/canvas/nodes/JiraCardNode.tsx`: memoized; lucide icon by `type_name` (bug, story, task, epic, sub-task, default), key, summary, status badge colored by `status_category` tokens; `not_found` shown as a muted "not found" state
- [x] T016 [US1] Create `frontend/src/canvas/Canvas.tsx` and `frontend/src/canvas/useBoardDoc.ts`: `ReactFlow` with pan, zoom, drag, `onlyRenderVisibleElements`, background, controls; load board via TanStack Query; debounced save (~500 ms after last change and on `pagehide`) with `version`; on 409 reload the board and show a toast-style alert; strip transient fields before save (depends on T014, T015)
- [x] T017 [US1] Create `frontend/src/canvas/Toolbar.tsx` with the "Jira card" tool: input accepts a key or URL, calls resolve, places the card at the viewport center (`screenToFlowPosition`); shows contract error messages inline (depends on T016)
- [x] T018 [US1] Update `frontend/src/App.tsx`: shell with a minimal board picker (list + "New board"), current board in `?board=<id>` via `history.replaceState`, last board in localStorage; canvas loaded with `React.lazy` and rendered only in the browser so `frontend/src/entry-server.tsx` prerender keeps working; update `frontend/src/App.test.tsx` (depends on T016, T017)

### Smoke and spike

- [x] T019 [US1] Extend `scripts/smoke.py`: create board, resolve `DEMO-1` and the `DEMO-2` URL, save a doc with two cards, get it back unchanged, check snapshots returned, check the web container proxies `/api/boards`
- [x] T020 [US1] Engine spike (timebox 2 h) on a throwaway branch: frame as parent node, `NodeResizer`, drag a card in and out via `getIntersectingNodes`. Record the verdict (keep xyflow or switch to Plait) with evidence in `docs/decisions.md` Done: keep xyflow; spike code on branch `spike/frames`.
- [x] T021 [US1] `CHANGELOG.md` `Unreleased`: boards with Jira cards (demo data)

**Checkpoint (G3)**: `make check`, `make up && make smoke`, `/ui-review`, reviewer subagent, engine verdict.

## Phase 3: Slice 2 `feat/jira-dc-connection` — connect real Jira DC (US1)

**Goal**: settings with base URL and PAT, encrypted at rest, test connection, real cards.

**Independent Test**: with `DRAWHL_SECRET_KEY` set and httpx `MockTransport` Jira: save settings, test connection returns the user, resolve a real-looking key; token string absent from every response and log line. Manual: real DC instance.

- [x] T022 [US1] Add `httpx` and `cryptography` to `backend/pyproject.toml` (`uv add`), lines in `THIRD_PARTY.md`, `make licenses`; add `drawhl_secret_key: SecretStr | None`, `jira_tls_verify: bool = True`, `jira_ca_bundle: str | None` to `backend/app/config.py`; document `DRAWHL_SECRET_KEY` (`openssl rand -base64 32`), `JIRA_TLS_VERIFY`, `JIRA_CA_BUNDLE` in `.env.example` and README
- [x] T023 [P] [US1] Add errors `SecretKeyMissing` (`secret_key_missing`, 400), `SecretUnreadable`, `JiraNotConfigured` (`jira_not_configured`, 400), `JiraUnauthorized` (`jira_unauthorized`, 401), `JiraRateLimited(retry_after)` (`jira_rate_limited`, 429) to `backend/app/domain/errors.py` and `backend/app/api/errors.py`; reuse `DependencyUnavailable` with code `jira_unavailable` (503)
- [x] T024 [P] [US1] Create `backend/app/adapters/secrets/fernet.py`: `FernetSecretBox(key)` and `NullSecretBox` (encrypt raises `SecretKeyMissing`, decrypt raises `SecretUnreadable`); add `SecretBox` and `SettingsRepo` protocols to `backend/app/domain/ports.py`. Tests in `backend/tests/test_secrets.py` (round-trip, wrong key → unreadable)
- [x] T025 [P] [US1] Add `settings` key-value table (migration 2) and `SqliteSettingsRepo` to `backend/app/adapters/storage/` with keys `provider` (default `demo`), `refresh_interval_s` (default 30, 30–300), `jira_base_url`, `jira_token_enc` Done as migration `002_settings.sql`.
- [x] T026 [P] [US1] Create `JiraDcProvider` in `backend/app/adapters/tasks/jira_dc.py`: reads URL and token per call, `Authorization: Bearer <PAT>`, httpx `Timeout(connect=5, read=15)`, TLS from config; `check` → `GET /rest/api/2/myself`; `resolve` → `GET /rest/api/2/issue/{key}?fields=summary,status,issuetype,assignee,priority,updated` (404 → `TaskNotFound`); done = `fields.status.statusCategory.key == "done"`; 401/403 → `JiraUnauthorized`; 429 → `JiraRateLimited` from `Retry-After`; 5xx, timeout, connect error → `DependencyUnavailable`. Tests with httpx `MockTransport` and made-up payloads in `backend/tests/test_jira_dc.py`
- [x] T027 [US1] Create settings domain service in `backend/app/domain/settings.py` (get with `token_state` `none | set | unreadable`, update with token omitted = keep, interval 30–300, `base_url` must be http(s)) and provider selection by `provider` setting in `backend/app/domain/tasks.py`; `jira` without URL or token → `JiraNotConfigured` (depends on T024, T025, T026)
- [x] T028 [US1] Create `backend/app/api/settings.py`: `GET /api/settings`, `PUT /api/settings`, `POST /api/settings/jira/test` per contract; wire secret box, settings repo and both providers in `backend/app/main.py`; register the token value for masking in log formatting in `backend/app/observability.py` (depends on T027)
- [x] T029 [US1] Token-leak test in `backend/tests/test_token_leak.py`: save a token, call every endpoint in the contract, assert the token string is absent from all response bodies and headers and from captured logs (`caplog`), including on Jira errors
- [x] T030 [P] [US1] Add shadcn `dialog`, `select`, `tooltip` (`npx shadcn@latest add`); create `frontend/src/api/settings.ts` (zod) and `frontend/src/settings/SettingsDialog.tsx`: provider switch, base URL, password field for the token (shows "set" or "unreadable, enter again", never a value), "Test connection" with result, explains `secret_key_missing`; open from the toolbar Done as a `Sheet` (per `DESIGN.md`) with `radio-group` instead of `dialog` and `select`.
- [x] T031 [US1] Extend `scripts/smoke.py`: `GET /api/settings` has no token field, `secret_key_configured` reported; demo remains default
- [x] T032 [US1] `CHANGELOG.md` `Unreleased`: connect Jira Data Center with a personal access token

**Checkpoint (G3)**: founder sees a real card from their DC.

## Phase 4: Slice 3 `feat/freshness` — statuses update on their own (US2)

**Goal**: open board refreshes every interval with one batched request; indicator, "Refresh all", strikethrough, backoff.

**Independent Test**: smoke changes `DEMO-1` to `Done` via the demo endpoint, calls refresh, gets `status_category: "done"`; in the browser the card is struck through within 30 s.

- [x] T033 [P] [US2] Add `set_status(key, status)` to `DemoTaskProvider` in `backend/app/adapters/tasks/demo.py` (`Done`, `Closed` → `done`; `In Progress`, `In Review` → `indeterminate`; else `new`) and implement batched `poll`; tests in `backend/tests/test_demo_provider.py`
- [x] T034 [P] [US2] Implement `poll` in `backend/app/adapters/tasks/jira_dc.py`: `POST /rest/api/2/search` body `{"jql": "key in (...)", "fields": [...], "maxResults": n}`, chunks of 500 keys; keys absent in the result → `not_found`; on 400 parse keys from `errorMessages` with `([A-Z][A-Z0-9_]+-\d+)`, mark them `not_found`, retry once without them. Tests in `backend/tests/test_jira_dc.py` Done in slice 2; sends `"validateQuery": false` (boolean), see `docs/decisions.md`.
- [x] T035 [P] [US2] Create `RefreshService` in `backend/app/domain/refresh.py`: keys from the saved doc, one `provider.poll` call, snapshots stored; on error snapshots untouched, `fails += 1`, `backoff_until = now + max(Retry-After, interval × 2^fails)` capped at 300 s; while in backoff raise `JiraRateLimited` without calling the provider; success resets. Injected clock. Tests in `backend/tests/test_refresh.py`
- [x] T036 [US2] Add `POST /api/boards/{id}/refresh` to `backend/app/api/boards.py` (returns `{tasks, fetched_at}`, 429 with `Retry-After` header) and `PUT /api/demo/tasks/{key}/status` in `backend/app/api/demo.py`; wire in `backend/app/main.py`; API tests in `backend/tests/test_api_refresh.py` (depends on T033, T035)
- [x] T037 [P] [US2] Create `frontend/src/board/useRefresh.ts`: TanStack Query `refetchInterval` = `refresh_interval_s` from settings, paused when the tab is hidden and refetched on visibility; doubles the interval on consecutive errors up to 300 s, resets on success; keeps previous data; merges tasks into the canvas snapshot cache
- [x] T038 [P] [US2] Create `frontend/src/board/RefreshIndicator.tsx`: "updated N s ago" ticking each second, error state with last success time, "Refresh all" button; strikethrough on `status_category === "done"` in `frontend/src/canvas/nodes/JiraCardNode.tsx`
- [x] T039 [US2] Add refresh interval field (30–300 s) to `frontend/src/settings/SettingsDialog.tsx`; mount indicator in `frontend/src/canvas/Toolbar.tsx` (depends on T037, T038)
- [x] T040 [US2] Extend `scripts/smoke.py`: set `DEMO-1` to `Done`, refresh, assert `done`; second board's keys are not in the refresh response
- [x] T041 [US2] Check `key in (...)` with a deleted key against a real DC; record the result in `docs/decisions.md` Done: a real DC rejects `"warn"` with 400; `false` works.
- [x] T042 [US2] `CHANGELOG.md` `Unreleased`: automatic status refresh, "Refresh all"

**Checkpoint (G3)**: the main hypothesis is testable by the founder.

## Phase 5: Slice 4 `feat/spatial` — frames, sticky notes, text, arrows (US3)

**Goal**: spatial organization of the board.

**Independent Test**: draw two frames, a sticky, a text label, drag three cards into a frame, connect a sticky to a card, move the frame: children and arrow follow; reload identical.

- [ ] T043 [P] [US3] Create `FrameNode` in `frontend/src/canvas/nodes/FrameNode.tsx` (editable title up to 200 chars, `NodeResizer`) and `frontend/src/canvas/useFrameDrop.ts`: on `onNodeDragStop` find the frame under the node center via `getIntersectingNodes`, set or clear `parentId`, convert absolute ↔ relative position, keep frames before children in the node array; no nested frames; no `extent: 'parent'`
- [ ] T044 [P] [US3] Create `StickyNode` and `TextNode` in `frontend/src/canvas/nodes/StickyNode.tsx` and `frontend/src/canvas/nodes/TextNode.tsx`: inline editing (text up to 5000 chars), sticky colors from `DESIGN.md` tokens, `NodeResizer`
- [ ] T045 [P] [US3] Add four handles (`t r b l`) to every node type via a shared `frontend/src/canvas/nodes/Handles.tsx`; edges with `connectionMode="loose"`, `markerEnd: ArrowClosed`, `sourceHandle`/`targetHandle` persisted
- [ ] T046 [US3] Extend `frontend/src/canvas/Toolbar.tsx` and `frontend/src/canvas/Canvas.tsx`: frame, sticky, text tools; box select and shift-click; Delete/Backspace removes selection and its edges (frame deletion keeps children, converting them to absolute) (depends on T043, T044, T045)
- [ ] T047 [US3] Backend test in `backend/tests/test_api_boards.py`: doc with frame, children, sticky, text and edges round-trips unchanged; child before parent → 422
- [ ] T048 [US3] Extend `scripts/smoke.py` with the spatial doc round-trip from [quickstart.md](quickstart.md) step 3
- [ ] T049 [US3] `CHANGELOG.md` `Unreleased`: frames, sticky notes, text, arrows; bottom toolbar, right-click menu, top bar, theme switch

Canvas chrome (US6), same slice because it owns `Toolbar.tsx` and `Canvas.tsx`:

- [ ] T062 [US6] Add shadcn `popover`, `dropdown-menu`, `context-menu`; rework `frontend/src/canvas/Toolbar.tsx` into the icon toolbar from `DESIGN.md`: the "Jira card" icon opens a `Popover` with the key-or-link input (Enter adds at viewport center, Escape closes, errors inline); no permanent input
- [ ] T063 [US6] Create `frontend/src/canvas/CanvasContextMenu.tsx` wrapping the canvas: empty spot → "Add Jira card" (input opens there, card placed at `screenToFlowPosition` of the click) plus frame, sticky and text from T046; selection → "Delete" (depends on T062, T046)
- [ ] T064 [P] [US6] Set `proOptions={{ hideAttribution: true }}` in `frontend/src/canvas/Canvas.tsx`
- [ ] T065 [P] [US6] Create `frontend/src/lib/theme.ts` (`light | dark | system`, `localStorage`, toggles `.dark` on `<html>`, follows `prefers-color-scheme` for system) and an inline script in `index.html` that applies it before first paint; pass the resolved mode to `ReactFlow` `colorMode` instead of `"system"`
- [ ] T066 [US6] Create `frontend/src/board/TopBar.tsx` replacing the board panel in `frontend/src/App.tsx`: main menu (Settings opens `SettingsSheet`, Theme submenu) and board name dropdown (switch, "New board" as an inline input in the dropdown); T055 later adds rename and delete here (depends on T065)
- [ ] T067 [US6] Component tests: toolbar popover adds a card and closes on Escape; theme choice toggles `.dark` and survives remount

## Phase 6: Slice 5 `feat/card-details` — collapse and mini-card (US4)

**Goal**: compact cards and details without leaving the board.

**Independent Test**: collapse a card → icon, key and status lozenge only; click → mini-card with assignee, priority, updated, Jira link; reload keeps collapsed state.

- [ ] T050 [P] [US4] Add shadcn `popover`; create `frontend/src/canvas/nodes/CardDetails.tsx`: assignee, priority, relative updated time, "Open in Jira" link (`target="_blank" rel="noreferrer"`)
- [ ] T051 [US4] Collapse toggle in `frontend/src/canvas/nodes/JiraCardNode.tsx` storing `data.collapsed`; collapsed view shows type icon, key and status lozenge in one line (no title), key struck through when done; click opens `CardDetails` (depends on T050)
- [ ] T052 [US4] Component test in `frontend/src/canvas/nodes/JiraCardNode.test.tsx`: collapsed and expanded render, done strikethrough, not-found state
- [ ] T053 [US4] `CHANGELOG.md` `Unreleased`: collapsible cards and mini-card

## Phase 7: Slice 6 `feat/boards` — several boards (US5)

**Goal**: manage boards; check the 300-card target.

**Independent Test**: create two boards with different content, switch, rename one, delete the other; viewport kept per board.

- [ ] T054 [P] [US5] Add `PATCH /api/boards/{id}` and `DELETE /api/boards/{id}` (204) to `backend/app/api/boards.py` with tests in `backend/tests/test_api_boards.py`
- [ ] T055 [P] [US5] Create `frontend/src/board/BoardList.tsx` inside the board dropdown of `frontend/src/board/TopBar.tsx`: list, create, rename, delete with confirm, switch; viewport saved in the doc and restored per board
- [ ] T056 [P] [US5] Create `scripts/bench_board.py`: seed a board with 300 cards across 10 frames via the API on the demo provider (keys cycling `DEMO-1..12`); document the manual pan/zoom and load-time check (target < 3 s) in `specs/001-live-jira-canvas/quickstart.md`
- [ ] T057 [US5] Extend `scripts/smoke.py`: rename and delete a board
- [ ] T058 [US5] `CHANGELOG.md` `Unreleased`: board list

## Phase 8: Polish (verify and ship phases)

- [ ] T059 README: problem, solution, core scenario, setup in ≤ 10 min (demo, then Jira DC with `DRAWHL_SECRET_KEY`), all ENV variables, limitations from Won't, screenshot made with demo data
- [ ] T060 Update `docs/architecture.md` with the final structure and `THIRD_PARTY.md` completeness check
- [ ] T061 Run [quickstart.md](quickstart.md) end to end on a clean clone (`make clean-clone`)

## Dependencies

- Setup (T001–T004) → Slice 1. Each slice depends on the previous one being merged into `main`.
- Slice 2 needs slice 1's ports and storage. Slice 3 needs slice 2's errors and `JiraDcProvider`. Slices 4–6 need only slice 1's canvas and could swap order; slice 4 goes first because it carries the brief's top UX risk.
- Within a slice: domain → ports → adapters → service → API → UI → smoke, as marked by "depends on".

## Parallel execution examples

- Slice 1: T005, T006, T007 together; then T009 and T010 together; T014 and T015 against the contract while the backend is built. Wiring (T012) is serial.
- Slice 2: T023, T024, T025, T026 and T030 touch disjoint files.
- Slice 3: T033, T034, T035 on the backend with T037, T038 on the frontend.
- Slice 4: T043, T044, T045, T064, T065; `Canvas.tsx` and `Toolbar.tsx` have a single owner (T062 → T046 → T063).
- Slices 5 and 6: mostly serial; Orca is not worth it (fewer than 3 `[P]` tasks with separate zones except slice 6).

## Implementation strategy

- MVP = Setup + Slice 1: a board with demo cards that survives reload, plus the engine verdict. Stop at G3.
- Slices 2 and 3 complete the core hypothesis (real Jira, fresh statuses); the founder can start the two-week usage test after slice 3.
- Slices 4–6 complete the Must scope. The Should item (JQL batch layout) is not planned.
