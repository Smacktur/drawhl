# Implementation Plan: Modules and the Gantt module

**Branch**: `002-modules` | **Date**: 2026-10-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-modules/spec.md`

## Summary

A module is one new board node type, `module`, with `data: {kind, content}`. The backend keeps one registry of content schemas per kind and validates content on save; unknown kinds pass through untouched. The frontend keeps one registry of module definitions (name, icon, defaults, zod schema, view, task keys) and renders every module through one generic `ModuleNode` shell: header, resizer, placeholder for unknown or broken content. Gantt is the first registered kind, written natively on top of xyflow (no Gantt library, see [research.md](research.md)). Task keys inside modules join the board's batched refresh, so Gantt bars are as live as cards. Delivered in 3 slices.

## Technical Context

**Language/Version**: Python 3.12+ (backend), TypeScript + React 19 (frontend)

**Primary Dependencies**: existing only. No new libraries: dates are calendar days handled with plain `Date` in UTC and `datetime.date` on the backend.

**Storage**: unchanged; module content lives inside `boards.doc`, no migration

**Testing**: pytest for content schemas, `task_keys` and doc rules; vitest for timeline math, registry and module shell; `scripts/smoke.py` extended per slice

**Target Platform**: unchanged

**Project Type**: web application

**Performance Goals**: Gantt with 100 rows pans and zooms smoothly (SC-003): one memoized node, bars as absolutely positioned divs, no per-bar xyflow nodes

**Constraints**: board limit 2000 elements; Gantt up to 200 rows, 100 milestones, 400 dependencies, range ≤ 3 years; module content ≤ 256 KB serialized

**Scale/Scope**: one module kind now, host ready for more

## Constitution Check

| Principle | Status |
|---|---|
| I. Main always runs | Pass: one `feat/<slice>` branch per slice |
| II. Works without keys | Pass: demo provider covers task rows |
| III. Hypothesis-driven scope | Pass: brief updated with a Next item (G1 approved by the owner on 2026-10-06); no writes to Jira |
| IV. Vertical slices | Pass: each slice is UI → API → domain |
| V. Contract-first | Pass: board document delta in [contracts/api.md](contracts/api.md) |
| VI. Production feel | Pass: content validated and size-limited on save |
| VII. Clean code | Pass |
| VIII. Verifiable tasks | Pass: timeline math and schemas unit-tested; smoke per slice |

## Design

### Board document

New node type `module`, see [data-model.md](data-model.md). Modules have no `parentId` and are never parents in this feature, so `check_doc`, `framesFirst` and `reparent` treat them as top-level elements.

### Backend

- `backend/app/domain/modules/__init__.py`: registry `MODULES: dict[str, ModuleKind]`, where `ModuleKind` holds the content model and `keys(content) -> set[str]`. `validate_module(kind, content)` normalizes known kinds and raises `ValidationFailed` with the kind in the message; unknown kinds are kept as is within the size limit.
- `backend/app/domain/modules/gantt.py`: `GanttContent` with its rules.
- `backend/app/domain/boards.py`: `ModuleNode` in the node union; `check_doc` calls `validate_module`; `card_keys` becomes `task_keys` and adds keys from modules. `RefreshService` and `get_board` use it, so no API change.

### Frontend

```text
frontend/src/modules/
  registry.ts          ModuleDef type, MODULES list, findModule(kind)
  ModulePicker.tsx     gallery popover: toolbar and right-click menu
  gantt/
    index.ts           ModuleDef for gantt
    schema.ts          zod content schema, defaults
    timeline.ts        date ↔ x math, header cells, snapping, ranges (pure)
    GanttModule.tsx    the view
    GanttRow.tsx, GanttBar.tsx, Milestone.tsx, Links.tsx
frontend/src/canvas/nodes/ModuleNode.tsx   generic shell
```

`ModuleDef<C>`:

```ts
type ModuleDef<C> = {
  kind: string
  name: string
  description: string
  Icon: LucideIcon
  size: { width: number; height: number }
  defaults: () => C
  schema: z.ZodType<C>
  keys: (content: C) => string[]
  View: ComponentType<ModuleViewProps<C>>
  acceptCard?: (content: C, key: string, at: { x: number; y: number }) => C
}

type ModuleViewProps<C> = {
  id: string
  content: C
  width: number
  height: number
  selected: boolean
  onChange: (next: C) => void       // writes node data, goes through undo history
  host: ModuleHost                   // resolveTask, ejectCard, ejectNote, setMinHeight
}
```

The shell owns the header (drag handle, module name, settings slot), `NodeResizer` and the placeholder. Everything interactive inside the view has `nodrag nopan` so it does not move the node or pan the canvas; the wheel still zooms the canvas (no inner scroll, the module grows instead).

Card drop: `Canvas` `onNodeDragStop` checks dropped cards against modules under their center; if the module's def has `acceptCard`, the card node is removed and the module content updated in one `setNodes`, so one undo step restores both.

Row eject: the Gantt view tracks a row drag; when the pointer leaves the module, it calls `host.ejectCard(key, screenPoint)` or `host.ejectNote(title, screenPoint)` and removes the row, again in one history step.

### Gantt view

- Range in calendar days `[start, end]`, `pxPerDay = (width - labelColumn) / days`.
- Header: quarter row on top; second row by scale: days (day), ISO weeks (week), months (month). Weekends shaded at day scale.
- Today line from the browser's local date.
- Bars: `left = (start - rangeStart) * pxPerDay`, width by days inclusive; drag body or ends with pointer capture, snap to whole days, end ≥ start.
- Task rows read live data from `TasksContext` (status color, strike-through for done, not-found state); new keys are resolved with `resolveTask` and added to the canvas `added` map like cards.
- Height: header + rows × 32 + footer; the shell sets the node's min height so the resizer cannot hide rows.
- Dependencies: SVG layer over the rows, path from bar end to next bar start; warning token when `to.start ≤ from.end`.

## Slices

| # | Branch | Stories | Result |
|---|---|---|---|
| 12 | `feat/module-host` | US1, US2 | `module` node, registries, picker, placeholder, Gantt timeline (range, scale, header, today, + quarter, settings, resize) |
| 13 | `feat/gantt-tasks` | US3 | rows and bars, drop card in, add by key or text, drag and stretch, reorder, eject, live status in refresh |
| 13b | `feat/gantt-tree` | US3b | rows nested in a tree, summary bars, collapse, indent and outdent, child rows |
| 14 | `feat/gantt-milestones` | US4 | milestones, dependency lines, conflict color |

## Complexity Tracking

Empty.
