# Research: Live Jira Canvas (MVP)

Decisions from the architecture review. Full list with dates in [docs/decisions.md](../../docs/decisions.md).

## Canvas engine

- **Decision**: `@xyflow/react` 12.
- **Rationale**: a card is a React node; `parentId` groups and handle-bound edges exist; MIT.
- **Alternatives**: tldraw (license), Excalidraw (no custom live nodes), Plait (fallback if the slice 1 spike fails).

## Where polling lives

- **Decision**: frontend-driven. The open tab calls `POST /boards/{id}/refresh` on a TanStack Query `refetchInterval`; the backend runs one batched JQL and persists snapshots.
- **Rationale**: "only the open board" and "pause in a background tab" come for free; no scheduler, no push channel; "Refresh all" is the same call.
- **Alternatives**: backend scheduler (needs open-board heartbeats and still a delivery channel to the browser).

## Board persistence

- **Decision**: whole-board JSON document, debounced save (~500 ms and on `pagehide`), `version` compare-and-set (409 on conflict).
- **Rationale**: maps one-to-one to xyflow state, one transaction, no diffing; 300 elements ≈ 100 KB.
- **Alternatives**: per-element rows (needs an operation protocol for no gain).

## Document shape

- **Decision**: node and edge fields mirror xyflow names (`position`, `parentId`, `sourceHandle`); backend validates with a Pydantic discriminated union and strips transient fields (`selected`, `dragging`, `measured`).
- **Alternatives**: own schema with mapping layers.

## Task snapshots

- **Decision**: separate `task_snapshots` table keyed by issue key; never stored in the doc.
- **Rationale**: two cards for one task share one fetch; refresh never rewrites the doc, so no save races with user edits.

## Storage and migrations

- **Decision**: stdlib `sqlite3`, `schema.sql` + `PRAGMA user_version`.
- **Alternatives**: SQLAlchemy and Alembic, Postgres (overkill for 3 tables).

## PAT at rest

- **Decision**: Fernet (`cryptography`) with `TIKO_SECRET_KEY` from env. Key required only to save a token; demo mode works without it. Missing key → `secret_key_missing`; key changed → `token_state: "unreadable"`. Token typed `SecretStr`, never serialized or logged.
- **Alternatives**: key file generated in `data/` (key next to ciphertext), plaintext.

## Provider selection

- **Decision**: runtime setting `provider: demo | jira`, default `demo`, switched in the settings UI.
- **Rationale**: fresh install works; connecting Jira needs no restart.
- **Alternatives**: `TASK_PROVIDER` env (restart), auto-switch on token presence (demo cards silently stop resolving).

## Jira DC REST

- **Decision**: `Authorization: Bearer <PAT>`. Test: `GET /rest/api/2/myself`. Resolve: `GET /rest/api/2/issue/{key}?fields=summary,status,issuetype,assignee,priority,updated` (404 also means no permission). Poll: `POST /rest/api/2/search` with `{"jql": "key in (...)", "fields": [...], "maxResults": n}`, chunks of 500 keys. Done = `fields.status.statusCategory.key == "done"`. httpx timeout connect 5 s, read 15 s. 401/403 → unauthorized; 429 → rate limited with `Retry-After`; 5xx, timeout, connect error → unavailable.
- **Rationale**: one request per board per tick; POST avoids URL length limits.
- **Alternatives**: incremental `updated >= -2m` (fallback if admins complain), per-card GETs, webhooks (Won't).
- **Sources**: [search API](https://developer.atlassian.com/server/jira/platform/rest/v10000/api-group-search/), [PAT](https://confluence.atlassian.com/enterprise/using-personal-access-tokens-1026032365.html), [rate limiting](https://confluence.atlassian.com/adminjiraserver/improving-instance-stability-with-rate-limiting-983794911.html).

## Backoff

- **Decision**: server-side `backoff_until = now + max(Retry-After, interval × 2^fails)`, capped at 300 s; while active, refresh returns 429 without calling Jira. Client doubles its interval on consecutive errors up to 300 s, resets on success, keeps previous data.

## Frames and edges in xyflow

- **Decision**: frames are parent nodes without `extent: 'parent'`; membership set in `onNodeDragStop` via `getIntersectingNodes` (frame under the node centre), positions converted absolute ↔ relative; no nested frames; parents sorted before children. Edges: `connectionMode="loose"`, four handles per node, `markerEnd: ArrowClosed`, handles persisted.
- **Alternatives**: `extent: 'parent'` (blocks dragging out), nested frames, floating edges.

## Smaller choices

- Type icon: lucide icon by issue type name (Jira icon URLs usually need a session).
- No router: current board in `?board=<id>`, last board in localStorage.
- Canvas is `React.lazy` and browser-only because the shell is prerendered.
- Demo provider: ~12 made-up tasks `DEMO-1..12` on `jira.example.com`, mutable status via `PUT /demo/tasks/{key}/status` so smoke proves freshness without Jira.
