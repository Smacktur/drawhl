# Implementation Plan: Live Jira Canvas (MVP)

**Branch**: `001-live-jira-canvas` | **Date**: 2026-10-05 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-live-jira-canvas/spec.md`

## Summary

A single-user, self-hosted canvas (`@xyflow/react` 12) where Jira Data Center tasks live as cards next to frames, sticky notes, text and arrows. The backend (existing FastAPI skeleton) stores each board as one JSON document in SQLite with a `version` compare-and-set, stores task snapshots in a separate table shared by key, and reaches Jira through a `TaskProvider` port with a demo adapter (default, no keys) and a Jira DC adapter (PAT, Fernet-encrypted at rest). Freshness is frontend-driven: the open tab calls `POST /boards/{id}/refresh` on a timer, the backend runs one batched JQL and backs off on errors. Delivered in 6 vertical slices; slice 1 ends with an engine verdict (xyflow vs Plait).

## Technical Context

**Language/Version**: Python 3.12+ (backend), TypeScript 5 + React 19 (frontend)

**Primary Dependencies**: existing FastAPI, Pydantic v2, uvicorn, prometheus-client; new `httpx` (Jira), `cryptography` (Fernet). Frontend existing Vite, Tailwind v4, shadcn/ui, TanStack Query, zod, lucide-react; new `@xyflow/react` 12

**Storage**: SQLite via stdlib `sqlite3`, `DB_PATH=data/app.db`, WAL, `PRAGMA user_version` migrations on startup

**Testing**: pytest (domain + API with `TestClient`, httpx `MockTransport` for Jira), vitest + Testing Library, `scripts/smoke.py` against the running stack

**Target Platform**: Docker Compose on Linux/macOS; desktop browsers

**Project Type**: web application (backend + frontend)

**Performance Goals**: status change visible ≤ 60 s (default interval 30 s); 300-card board loads < 3 s and pans smoothly

**Constraints**: one Jira request per open board per interval; token never in responses or logs; works without keys; all data in `./data`

**Scale/Scope**: 1 user per instance, tens of boards, up to ~300 elements per board

## Constitution Check

| Principle | Status |
|---|---|
| I. Main always runs | Pass: one `feat/<slice>` branch per slice, merge after G3 |
| II. One command, works without keys | Pass: demo provider is the default; `DRAWHL_SECRET_KEY` needed only to save a PAT |
| III. Hypothesis-driven scope | Pass: slices map to core scenario steps; nothing from Won't (no webhooks, no two-way sync, no auth) |
| IV. Vertical slices | Pass: 6 slices, each UI → API → domain → storage |
| V. Contract-first, ports and adapters | Pass: [contracts/api.md](contracts/api.md) fixed; `TaskProvider`, `BoardRepo`, `SettingsRepo`, `SecretBox` ports in `domain/ports.py` |
| VI. Production feel | Pass: existing `/health`, `/ready`, `/metrics`, JSON logs, error format reused; httpx timeouts; token masking test |
| VII. Clean code | Pass: ruff, oxlint, prettier via `make check` |
| VIII. Verifiable tasks | Pass: each slice extends `scripts/smoke.py`; domain unit tests |
| Constraints: SQLite default | Pass |

Re-checked after Phase 1 design: no violations, Complexity Tracking empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-live-jira-canvas/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/api.md
└── tasks.md            # /speckit-tasks
```

### Source Code (existing skeleton, new files marked +)

```text
backend/app/
├── main.py                 # wiring: repos, providers, secret box
├── config.py               # + DB_PATH, DRAWHL_SECRET_KEY, JIRA_TLS_VERIFY, JIRA_CA_BUNDLE
├── api/
│   ├── errors.py           # extend domain error → HTTP mapping
│   ├── routes.py           # include routers
│   ├── boards.py         + # /boards, /boards/{id}/refresh
│   ├── tasks.py          + # /tasks/resolve
│   ├── settings.py       + # /settings, /settings/jira/test
│   └── demo.py           + # /demo/tasks/{key}/status
├── domain/
│   ├── errors.py           # extend
│   ├── ports.py          + # TaskProvider, BoardRepo, SettingsRepo, SecretBox
│   ├── boards.py         + # doc validation, CAS save
│   ├── tasks.py          + # Task, parse key/URL, provider selection
│   └── refresh.py        + # RefreshService, backoff
└── adapters/
    ├── storage/          + # sqlite.py, schema.sql
    ├── tasks/            + # demo.py, jira_dc.py
    └── secrets/          + # fernet.py
backend/tests/              # + test_boards, test_tasks, test_refresh, test_jira_dc, test_secrets, test_token_leak

frontend/src/
├── App.tsx                 # shell: board picker + lazy canvas
├── api/                    # client.ts (zod), + boards.ts, tasks.ts, settings.ts
├── canvas/               + # Canvas.tsx, Toolbar.tsx, useBoardDoc.ts, useFrameDrop.ts
│   └── nodes/            + # JiraCardNode, FrameNode, StickyNode, TextNode
├── board/                + # RefreshIndicator.tsx, useRefresh.ts, BoardList.tsx
├── settings/             + # SettingsDialog.tsx
└── components/ui/          # shadcn (add dialog, popover, dropdown-menu, tooltip as needed)
scripts/smoke.py            # extended per slice
```

**Structure Decision**: reuse the launchpad skeleton (`backend/app` layers, `frontend/src`); the `greeting` example is removed in slice 1. `frontend/src/entry-server.tsx` prerenders only the shell; the canvas is `React.lazy` and browser-only.

## Slices

| # | Branch | Core step | Delivers | Spec |
|---|---|---|---|---|
| 1 | `feat/card-on-board` | 1, 3, 5 (save) | Minimal canvas (pan, zoom, drag), create/open board, Jira card by key or URL on the demo provider, debounced save, reload identical. Ends with a 2 h spike (frame as parent node, resize, drag in and out) and an engine verdict in `docs/decisions.md` | US1 minus real Jira |
| 2 | `feat/jira-dc-connection` | 1 | Settings dialog, Fernet PAT, test connection, `JiraDcProvider.resolve`, provider switch, token-leak test | US1 |
| 3 | `feat/freshness` | 5 | Refresh endpoint with batched JQL, client timer, "updated N s ago", "Refresh all", strikethrough on done, backoff, demo status endpoint, smoke proves freshness | US2 |
| 4 | `feat/spatial` | 2, 4 | Frames, sticky notes, text, arrows, multi-select | US3 |
| 5 | `feat/card-details` | 4 | Collapse to key, mini-card popover | US4 |
| 6 | `feat/boards` | 2 | Board list rename/delete/switch, per-board viewport, 300-card benchmark | US5 |

## Risks

| Risk | Fallback |
|---|---|
| xyflow feels like a graph editor | Slice 1 spike + verdict; Plait prototype in one day before slice 2 |
| `key in (...)` with a deleted or invisible key returns 400 | Parse keys from `errorMessages`, mark `not_found`, retry once without them; check on real DC in slice 3 |
| Corporate CA or self-signed TLS | `JIRA_CA_BUNDLE`, `JIRA_TLS_VERIFY` |
| 300 cards slow | `onlyRenderVisibleElements`, memoized nodes, benchmark in slice 6 |
| Token leak | `SecretStr`, test over all responses and captured logs |
| Two tabs overwrite a board | `version` CAS, 409, client reloads |
| Prerender breaks on xyflow | canvas is lazy and browser-only |

## Complexity Tracking

No violations.
