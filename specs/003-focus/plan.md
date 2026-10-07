# Implementation Plan: Focus timer and music

**Branch**: `003-focus` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-focus/spec.md`

## Summary

A frontend-only feature. A pure timer state machine with the end time stored in `localStorage`, a color function from state and progress to hue and chroma, and one `FocusCapsule` component pinned at the top center of the app, next to the top bar and the sync indicator. Music is an `<audio>` element driven by a small player hook with a built-in playlist of 7 CC0 MP3 files served as static assets. Delivered in 2 slices.

## Technical Context

**Language/Version**: TypeScript + React 19

**Primary Dependencies**: existing only (radix popover, lucide icons). Web Audio, Notification and HTMLAudioElement from the browser.

**Storage**: `localStorage` keys `drawhl.focus` (settings and timer state) and `drawhl.music` (track, volume, pause on breaks)

**Testing**: vitest for the state machine, colors and the capsule; Playwright run against the stack for the screenshot

**Constraints**: no backend change, no new dependency, built-in audio ≤ 20 MB

## Constitution Check

| Principle | Status |
|---|---|
| I. Main always runs | Pass: one `feat/<slice>` branch per slice |
| II. Works without keys | Pass: nothing external |
| III. Hypothesis-driven scope | Pass: owner asked for it on 2026-10-07 and approved the design; G1 and G2 approved by the owner the same day |
| IV. Vertical slices | Pass: each slice is usable alone |
| V. Contract-first | Pass: no API change |
| VI. Production feel | Pass: state survives reload, drift-free countdown |
| VII. Clean code | Pass |
| VIII. Verifiable tasks | Pass: state machine unit-tested |

## Design

```text
frontend/src/focus/
  timer.ts          settings, state, start, pause, resume, reset, skip, finish, view
  tone.ts           state and progress → hue, hue2, chroma
  store.ts          localStorage-backed store, useFocus(), 1 s ticker, end-of-phase effects
  alerts.ts         chime (Web Audio) and notification
  FocusCapsule.tsx  dial and player row
  FocusSettings.tsx popover with Timer and Music tabs
  music.ts          built-in playlist, useMusic()
frontend/public/music/  7 MP3 files
```

The capsule's visibility is a flag in the same store, toggled from the main menu.
