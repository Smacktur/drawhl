# Implementation Plan: Search on the board

**Branch**: `005-search` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/005-search/spec.md`

## Summary

A frontend-only feature. A pure index turns board nodes and task snapshots into search entries; a pure matcher parses the query (words, filters, layout fallback) and ranks entries. A palette on the shadcn `Dialog` shows the results and talks to the canvas through a few callbacks: jump, preview, restore viewport, select. Delivered in 4 slices.

## Technical Context

**Language/Version**: TypeScript + React 19

**Primary Dependencies**: existing only (radix dialog, xyflow, lucide, react-hotkeys-hook). No `cmdk`: ranking is our own, so its filtering would be switched off anyway, and the list is a plain `listbox`.

**Storage**: recent jumps in `localStorage` `drawhl.search.recent.<boardId>`.

**Testing**: vitest for the index, matcher, layout map, ranking, filters and the palette (keyboard, jump, restore); screenshot against the running stack.

**Constraints**: no new dependency, no backend or API change.

## Constitution Check

| Principle | Status |
|---|---|
| I. Main always runs | Pass: one `feat/<slice>` branch per slice |
| II. Works without keys | Pass: searches the board and the mock tracker's snapshots |
| III. Hypothesis-driven scope | Pass: draft idea 1 of the owner's list, shaped on 2026-10-07 (G1) |
| IV. Vertical slices | Pass: each slice is usable alone |
| V. Contract-first | Pass: no API change |
| VI. Production feel | Pass: keyboard first, restores the view, survives reload |
| VII. Clean code | Pass |
| VIII. Verifiable tasks | Pass: pure logic unit-tested |

## Design

```text
frontend/src/search/
  index.ts          nodes + tasks → entries (kind, fields, title, context, target)
  match.ts          normalize, split, match, rank, highlight ranges, snippet
  layout.ts         Russian ↔ English keyboard layout map
  query.ts          filters and chips (slice 3)
  commands.ts       command list (slice 4)
  recent.ts         recent jumps in localStorage
  palette.ts        open state shared by the shortcut and the main menu
  SearchPalette.tsx dialog, input, result list, keyboard
  BoardSearch.tsx   wires the palette to the canvas: jump, preview, highlight, select
```

Index: entries are rebuilt with `useMemo` on nodes and tasks, and only while the palette is open. Each entry keeps a normalized haystack (lowercase, NFD without marks) so a keystroke is one pass of `includes` per word.

Jump: `flyTo` moves from `timers/` to `canvas/fly.ts` and gains a fit mode for elements bigger than the screen; the flash becomes a node class applied in `raiseAnchors`' output, so every node kind can flash, not only timers.

Highlight (slice 2): the canvas gets a `searching` class and a set of matching ids as node classes; CSS dims the rest. Preview stores the viewport on open and restores it on cancel.
