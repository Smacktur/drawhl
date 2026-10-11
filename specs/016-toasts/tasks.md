---
description: "Task list for Toasts"
---

# Tasks: Toasts

**Input**: [spec.md](spec.md)

**Tests**: included; screenshots with made-up data only.

## Format: `[ID] [P?] [Story] Description`

- Frontend paths under `frontend/src/`

## Phase 1: Slice `feat/toasts` — actions answer in one place (US1) 🎯

- [x] T001 [US1] `sonner` in `components/ui/sonner.tsx` on the theme tokens and the app's own theme hook; mounted next to `App` in `main.tsx` and `entry-server.tsx`; `lib/toast.ts` with `toastError`; `THIRD_PARTY.md`, `make licenses`
- [x] T002 [US1] Errors of actions as toasts: Share (roles, removing, transfer, adding, public link, copy), People (role, disable, reset, revoke, invite), the public links switch, "Sign out everywhere", removing a token, deleting and renaming a board
- [x] T003 [US1] Success toasts: profile, password, task source, token saved and removed, board deleted, shared with a person, new owner, a person's role and state, link revoked. The "Saved." lines are gone
- [x] T004 [US1] The timed alerts as toasts: failed paste, lost board; `live/notice.ts` removed
- [x] T005 [US1] `components/ui/dialog.tsx`: a click on a toast does not close the dialog. Tests: a success and an error toast in Settings
- [x] T006 [US1] `DESIGN.md`, `CHANGELOG.md`; checked on the compose stack in both themes (a toast over Settings, a failed paste); `make check`
