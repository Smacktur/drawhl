---
description: "Task list for Public link"
---

# Tasks: Public link

**Input**: [spec.md](spec.md), [plan.md](plan.md), [data-model.md](data-model.md), [contracts/api.md](contracts/api.md)

**Tests**: included in every slice; screenshots with made-up data only.

## Format: `[ID] [P?] [Story] Description`

- Backend paths under `backend/app/`, frontend paths under `frontend/src/`

## Phase 1: Slice `feat/public-link` — show a board to anyone (US1) 🎯

**Goal**: an owner makes a link, anyone opens the board view-only, the link dies when turned off.

- [x] T001 [P] [US1] Migration `009_public.sql`; `BoardRepo.public_token`, `set_public_token`, `by_public_token`; `public` on board rows and summaries. Tests
- [x] T002 [US1] `domain/public.py`: `PublicLinks` (on, off, a new token every time, lookup, budget per link), `public_board`, `private_tasks`; `Task.state` gains `private`. Tests: a link turned off never works again, the budget, the instance switch
- [x] T003 [US1] `SettingsService.public_links`, in `SettingsView` and `SettingsIn`. Tests
- [x] T004 [US1] `api/public.py` and the gate; `PUT /boards/{id}/public`; members answer with `public` and, for the owner, `public_token`. Tests: access matrix (token on other routes, changing methods on guest routes), who makes and sees the link, nothing about people in a guest's answers, keys only on a Jira-backed board (SC-003)
- [x] T005 [P] [US1] `api/public.ts`, `useRefresh` and `useLiveBoard` for a guest, `BoardCanvas` with `guest`; cards and Gantt rows for a `private` task. Tests
- [x] T006 [US1] `public/PublicBoard.tsx`: the page, its bar (name, View only, search, focus timer, theme, Sign in), the 5 s version check, "This board is not available."; `App.tsx` opens it on `/p/{token}`. Tests
- [x] T007 [US1] Share dialog: "Anyone with the link can view" with a switch, the address and Copy; "Public" mark in the top bar and the board list. Tests
- [x] T008 [US1] Settings → Instance → Sharing: the admin's switch. Test
- [x] T009 [P] [US1] `nginx.conf.template`: `/p/` with `X-Robots-Tag` and `Referrer-Policy`; checked on the compose stack
- [x] T010 [US1] Check on the compose stack in a clean browser: the board renders, an owner's change shows within 5 s, a link turned off shows the message; `make check`
- [x] T011 [US1] Guide ("Public link" in Working together, Security), `DESIGN.md`, `CHANGELOG.md`

## Phase 2: Slice `feat/public-live` — the guest sees the board live (US2)

- [ ] T012 [US2] Guest socket `/api/public/{token}/live`: read-only, awareness dropped both ways, its own limit per board, closed through the live port when the link is turned off, the board is deleted or public links are switched off. Tests
- [ ] T013 [US2] The guest page on the socket instead of the version check; a full board falls back to reload with a note. Tests
- [ ] T014 [US2] SC-005: 100 guests on a board do not slow an editor
