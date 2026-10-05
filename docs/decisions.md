# Decisions

`date — decision — why — alternatives`

- 2026-10-05 — FastAPI + React/TS from launchpad, profile oss — fast start with production feel out of the box — choosing a stack from scratch
- 2026-10-05 — canvas engine `@xyflow/react` 12; verdict confirmed by a spike at the end of slice 1 — cards are React nodes, `parentId` groups and handle-bound edges built in, MIT — tldraw (license), Excalidraw (no custom live nodes), Plait (fallback)
- 2026-10-05 — slice order: card on board (demo) → Jira DC connection → freshness → spatial → card details → boards — shortest path to a live card; engine risk answered by the slice 1 spike — canvas-only first slice
- 2026-10-05 — frontend-driven refresh: open tab calls `POST /boards/{id}/refresh` on a timer, backend runs one batched JQL — only the open board is polled, background tabs pause, "Refresh all" is the same call — backend scheduler with heartbeats and a push channel
- 2026-10-05 — board stored as one JSON doc with debounced save and `version` compare-and-set (409) — maps to xyflow state, one transaction, two tabs can't overwrite — per-element rows
- 2026-10-05 — doc fields mirror xyflow names, validated by a Pydantic discriminated union that strips transient fields — no mapping code — own schema with mapping layers
- 2026-10-05 — task snapshots in a `task_snapshots` table keyed by issue key, not in the doc — one fetch per key, refresh never races with saves — snapshot inside node data
- 2026-10-05 — SQLite via stdlib, `schema.sql` + `PRAGMA user_version` migrations — 3 tables, one volume, upgrade-safe — SQLAlchemy/Alembic, Postgres
- 2026-10-05 — PAT encrypted with Fernet, key `DRAWHL_SECRET_KEY` from env, required only to save a token; `SecretStr`, leak test over responses and logs — operator-supplied key per FR-002, explicit failure modes — key file in `data/`, plaintext
- 2026-10-05 — provider is a runtime setting `demo | jira`, default `demo` — fresh install works, connecting Jira needs no restart — `TASK_PROVIDER` env, auto-switch on token presence
- 2026-10-05 — Jira DC: Bearer PAT, `myself` for test, `issue/{key}` for resolve, `POST search` with `key in (...)` for poll, done by `statusCategory.key`, timeouts 5/15 s — one request per board per tick — per-card GETs, webhooks (Won't); incremental `updated >= -2m` kept as fallback
- 2026-10-05 — backoff: server `backoff_until = now + max(Retry-After, interval × 2^fails)` capped at 300 s, client doubles its interval on errors — protects DC from load — fixed-rate retries
- 2026-10-05 — frames are parent nodes without `extent: 'parent'`, membership on drag stop via `getIntersectingNodes`, no nesting; edges with 4 handles, `connectionMode="loose"` — drag in and out works — `extent: 'parent'`, nested frames, floating edges
- 2026-10-05 — issue type icon from lucide by type name — Jira icon URLs need a session — proxying Jira icons
- 2026-10-05 — no router: board in `?board=<id>`, last board in localStorage — one screen — react-router
- 2026-10-05 — canvas is `React.lazy` and browser-only — the shell is prerendered in Node — SSR of xyflow
- 2026-10-05 — engine verdict after the slice 1 spike: keep `@xyflow/react` — a frame as a parent node with `NodeResizer` works; a card dropped with its centre inside a frame gets `parentId` and a relative position, moves with the frame, survives reload and detaches when dragged out (checked in a real browser). Two findings: `useReactFlow().setNodes` in a controlled flow did not apply the reparenting, so the drop handler uses the `useNodesState` setter; cards under a newly drawn frame do not join it until dragged. Spike code kept on branch `spike/frames` for slice 4 — Plait prototype not needed
