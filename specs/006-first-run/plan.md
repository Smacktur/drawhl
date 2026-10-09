# Implementation Plan: First run and polish

**Branch**: `006-first-run` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/006-first-run/spec.md`

## Summary

The welcome board is built by a pure domain function and seeded by the boards service the first time the list is read on an empty, never-seeded database. The other three stories are frontend only: fit-to-note for sticky text, themed scrollbars in `index.css`, and pasting outside text through the native `paste` event. Delivered in 4 slices.

## Technical Context

**Language/Version**: Python 3.12 + FastAPI, TypeScript + React 19

**Primary Dependencies**: existing only.

**Storage**: seed flag `welcome_seeded` in the existing `settings` table; "Paste text as" in `localStorage` `tiko.paste.as`.

**Testing**: pytest for the welcome doc (validates, dates from today, demo keys only) and the seed rules (once, not after delete, not on upgrade, one board under concurrent requests); vitest for the fit steps, the paste handler and the setting; screenshot per slice.

**Constraints**: no new dependency, no API contract change: `GET /boards` keeps its shape and may return the seeded board.

## Constitution Check

| Principle | Status |
|---|---|
| I. Main always runs | Pass: one `feat/<slice>` branch per slice |
| II. Works without keys | Pass: the welcome board runs on the demo tracker |
| III. Hypothesis-driven scope | Pass: launch plan step 4 and draft ideas 5, 8, 10, agreed on 2026-10-07 (G1) |
| IV. Vertical slices | Pass: each slice is usable alone |
| V. Contract-first | Pass: no API change |
| VI. Production feel | Pass: first screen is useful, seed is idempotent |
| VII. Clean code | Pass |
| VIII. Verifiable tasks | Pass: seed rules and fit steps unit-tested |

## Design

```text
backend/app/domain/welcome.py    welcome_doc(today) -> BoardDoc: frames, notes, cards, edges, Gantt, timer
backend/app/domain/boards.py     list_boards(boards, settings): seed when empty and not seeded
backend/app/api/boards.py        GET /boards calls the service instead of the repo
frontend/src/canvas/nodes/StickyNode.tsx   fit text to the note
frontend/src/canvas/fit.ts        pure step search for the font size
frontend/src/index.css            scrollbar styles on theme tokens
frontend/src/canvas/paste.ts      outside text -> text or sticky node at the pointer
frontend/src/settings/SettingsSheet.tsx   "Paste text as" control
```

Seed: `list_boards` reads the list; when it is empty and `welcome_seeded` is unset, it sets the flag first and then creates the board inside one SQLite transaction (`BEGIN IMMEDIATE`), so two concurrent requests create one board. A non-empty list on first read sets the flag without seeding, which covers upgrades. The welcome doc is validated with `check_doc` in a test; the frontend fits the view when it opens a board at version 1, that is never saved since it was created; for a new empty board this does nothing.

Sticky fit: after the text or size changes, binary-search the largest font size from 14 px down that makes `scrollHeight` fit the note's inner height; the size is a CSS variable on the node, not saved in the doc. The textarea has `maxLength` 2000; an input or paste that hits it triggers the "no entry" flash (a lucide `Ban` icon over the note, CSS fade).

Scrollbars: `scrollbar-width: thin` and `scrollbar-color` on `*` for Firefox, `::-webkit-scrollbar` rules for Chromium and Safari, colors from `--muted-foreground` with alpha, transparent track.

Paste: one native `paste` handler runs an ordered list of steps; the first that takes the clipboard wins. 1) Copied tiko elements: copy also writes `application/x-tiko` with an id through the `copy` event; when it matches the in-memory buffer, elements are pasted as today. 2) Task keys and links: split `text/plain` by lines, spaces and commas; when every item parses as a key or a link of the connected tracker (the same parser as the Jira card input's "several keys" mode), the existing add-several flow adds the cards in a grid at the pointer. 3) Plain text: a text or sticky node. Draft idea 13's other trackers plug into step 2 through their providers. Paste inside editable targets is ignored by the board.

## Risks

| Risk | Plan B |
|---|---|
| `copy` event data is not written when the shortcut fires on a non-editable target in some browsers | Fall back to "last copy wins" by time: keep the buffer when it was set after the window last lost focus |
| Measuring text on every keystroke is slow on big boards | Measure only the edited node, in `requestAnimationFrame`; others measure once on mount |
