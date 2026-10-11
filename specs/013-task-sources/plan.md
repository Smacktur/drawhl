# Implementation Plan: Task sources

**Spec**: [spec.md](spec.md) | **Data**: [data-model.md](data-model.md) | **Contract**: [contracts/api.md](contracts/api.md)

## Summary

`Task` gets a `source`, and a task is addressed by its ref `source:key` everywhere a key alone was used: the answers' task maps, the cache, the refresh. The API hands the domain a set of providers by source id instead of one provider. The web app gets a registry of sources that names them and holds their marks, and the card shows the mark when the board mixes sources.

## Structure

```text
backend/app/domain/tasks.py        Task.source, ref helpers, NoTokenProvider per source
backend/app/domain/boards.py       optional source on cards and timer watches; task_refs instead of task_keys
backend/app/domain/modules/        Gantt task rows with an optional source
backend/app/domain/refresh.py      one poll per source of the board, a status per source
backend/app/domain/welcome.py      the welcome board carries source "demo"
backend/app/domain/public.py       full or private by the task's source
backend/app/api/deps.py            providers(): the instance's tracker and the demo source, by id
backend/app/adapters/tasks/        each provider sets Task.source
backend/app/adapters/storage/      migration 011, snapshots by (person, source, key)
frontend/src/api/tasks.ts          source in the task schema
frontend/src/sources/registry.ts   id, name, marks; marks/*.svg
frontend/src/sources/SourceMark.tsx
frontend/src/canvas/tasks-context.ts  lookup by ref; whether the board is mixed
frontend/src/canvas/nodes/         JiraCardNode, CardDetails: mark and texts from the source
frontend/src/board/RefreshIndicator.tsx  mark per row
frontend/src/modules/gantt/        mark in task rows, lookup by ref
```

## Decisions

- **The ref is a string, `source:key`.** A source id never holds a colon, so the first colon splits it. One string keeps the JSON maps and the React lookups as simple as they are.
- **A missing source means the instance's tracker.** Stored boards and their CRDT state stay untouched; there is no document migration. New cards, rows and watches always write the source.
- **The node type stays `jira_card`.** Renaming it means rewriting every stored document and its CRDT state for a name people never see.
- **The domain takes `dict[str, TaskProvider]`.** `deps.providers` builds it per request: the demo provider always, plus Jira (or its no-token stand-in) when the instance is set to it. A ref whose source is not in the set comes back as `not_found`.
- **A typed key still goes to one tracker.** `resolve` and `search` use the instance's tracker, as today. Choosing a tracker when adding belongs to the spec that adds the second real one.
- **The cache is each person's own for every source.** A guest gets demo tasks straight from the demo source and never reads a cache.
- **A missing source is answered by the web app's lookup.** The board answer names the instance's tracker as `default_source`; the lookup holds tasks by ref and, for that tracker, by bare key too, so no place that reads a task needs to know the default.
- **The cache is carried over.** Migration 011 copies each person's rows into the new table under the tracker the instance is set to and writes the source into the stored task. Rows of nobody were the shared demo tasks and are left behind.
- **The registry lives in the web app.** A mark is a bundled file, so names and marks sit together there. The backend keeps `source_name` for the sync status only.
- **Mixed is computed, not stored.** The tasks context counts the distinct sources among the board's refs.
- **Marks are plain `<img>` of the official SVG**, one file per theme where the owner provides two. They are never recolored with CSS.
- **Extra rows and chips are left out** until GitHub Issues produces them, so no field ships without a producer.

## Slices

| Branch | Story | Done when |
|---|---|---|
| `feat/task-sources` | US1 | on an instance set to a mock Jira the welcome board's demo tasks are live next to Jira cards, two same-key tasks show two titles, the sync list has a row per source, an old board opens unchanged |
| `feat/source-mark` | US2 | a mixed board shows marks on cards, Gantt rows, the mini-card and the sync list in both themes; a one-source board matches the old screenshot |

## Risks

| Risk | Answer |
|---|---|
| A lookup by bare key is missed and a card stays on "Loading…" | one `taskRef` helper on each side; the task map type takes refs only; tests on cards, Gantt, timers, search, clipboard |
| A guest sees task data fetched with a token | the private rule keys on the source; the byte test of spec 012 runs on a mixed board |
| A trademark owner objects to a mark | official files, unchanged, small, named in `THIRD_PARTY.md`; one registry entry to remove |
