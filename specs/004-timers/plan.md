# Implementation Plan: Timers on the board

**Branch**: `004-timers` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-timers/spec.md`

## Summary

A new board node `timer`. Attachment is xyflow's `parentId`, so a timer moves with its element and xyflow deletes it with its parent; the frame helpers learn one more nesting level (frame → element → timer). The time logic is pure: parse input, compute state and the next repeat, format the time left. One hook in the canvas ticks once a second, notices timers that went off, notifies once per tab and drives the title and the corner note. The backend only learns the node type. Delivered in 3 slices.

## Technical Context

**Language/Version**: TypeScript + React 19, Python 3.12 + FastAPI

**Primary Dependencies**: existing only (xyflow, radix popover, lucide). Notification and Web Audio from the browser; the chime is shared with the focus timer.

**Storage**: timers live in the board document (server). Which timers already notified lives in `localStorage` `tiko.timers.notified`, so a reload does not notify twice.

**Testing**: vitest for parsing, state, repeat, attach and delete rules, the cube and the hook; pytest for the node type and parent rules; screenshot against the running stack.

**Constraints**: no new dependency.

## Constitution Check

| Principle | Status |
|---|---|
| I. Main always runs | Pass: one `feat/<slice>` branch per slice |
| II. Works without keys | Pass: mock tracker statuses drive status timers |
| III. Hypothesis-driven scope | Pass: idea 10 of the owner's list, shaped and approved on 2026-10-07 (G1 and G2) |
| IV. Vertical slices | Pass: each slice is usable alone |
| V. Contract-first | Pass: [contracts/api.md](contracts/api.md), additive |
| VI. Production feel | Pass: survives reload, no double notifications, undo |
| VII. Clean code | Pass |
| VIII. Verifiable tasks | Pass: pure logic unit-tested |

## Design

```text
frontend/src/timers/
  time.ts          parse input, format left and due, presets
  timer.ts         state (running, soon, fired, done, watching), next repeat, snooze, done
  attach.ts        attach and detach on drop, which elements take a timer
  alerts.ts        notified set in localStorage, notification with click-to-fly
  useTimers.ts     1 s ticker, going off, title count, missed-while-closed note
  TimerNode.tsx    the cube with tooltip and popover
  TimerEditor.tsx  popover content
  TimerNotes.tsx   corner notes for timers that went off
  TimerList.tsx    board button and panel (slice 2)
  fly.ts           move the board to a node and flash it
backend/app/domain/boards.py  TimerNode, parent rules
```

Ordering: xyflow needs parents before children, so nodes go frames → other elements → timers (`framesFirst`). `absolute()` walks up the parent chain. Deleting a frame keeps its children and their timers. A card absorbed by a module leaves its timers free at the same place.

Going off is derived: a running timer whose effective moment (`snoozedUntil` or `dueAt`) has passed. Only status timers write when they go off (`dueAt` = now). The notified set keys on timer id and moment.
