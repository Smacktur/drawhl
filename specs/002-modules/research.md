# Research: Modules and the Gantt module

## Decision: native Gantt on xyflow, no Gantt library

**Options looked at** (MIT or MIT core): SVAR React Gantt, Frappe Gantt, gantt-task-react.

**Why not a library**:

- Each library owns its viewport: its own scroll and zoom fight the canvas pan and zoom when placed inside a node.
- Each library owns its task model: dropping a live card into it and getting it back out needs glue on both sides.
- Styling goes through overriding their CSS instead of the `DESIGN.md` tokens.
- SVAR keeps part of the features in a paid edition; Frappe Gantt is not React; gantt-task-react moves slowly.

**What we need is small**: date ↔ x math, a two-row header, bars with drag and resize, milestones, and lines. That is a few hundred lines of pure, testable code, and it reuses the canvas zoom, undo, clipboard and theme.

## Decision: one `module` node type with `kind`, not one node type per module

A single type keeps the board schema, `check_doc`, clipboard, history and node registration closed to change: a new kind touches only its own folder and the two registries (FR-002). Unknown kinds round-trip, so an older tiko does not destroy a board made by a newer one.

## Decision: rows stored in module content, not as child nodes

Bars as xyflow child nodes would bring per-node overhead (100 rows = 100 nodes with drag handlers) and a fight between node drag and date drag. Rows as content keep one node per Gantt and make the content schema the single source of truth.

## Decision: plan dates on the board only

Brief Won't: two-way sync. Reading Jira due and start dates is a later feature that can fill empty rows without changing this model.

## xyflow details checked (context7)

- `nodrag` on an element stops node dragging from it; `nopan` stops canvas pan; `nowheel` would stop canvas zoom and is not used here.
- `NodeResizer` is already used by frames; it supports `minWidth` and `minHeight`.
