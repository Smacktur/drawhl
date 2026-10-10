# Feature Specification: Public link

**Feature Branch**: `012-public-link`

**Created**: 2026-10-10

**Status**: Approved at G2 on 2026-10-10.

**Input**: Owner's decision at G1 on 2026-10-10: build guest mode before the demo of [spec 011](../011-demo/spec.md). "Guest mode is for looking only, without moving or creating anything: so that people can share their boards publicly, and so that we can show our roadmap to everyone. Sharing needs work for this too."

## Why

Today every page asks for a sign-in, and "everyone" in Share means everyone with an account. A board cannot be shown to a client, posted in a chat or linked from a README. A public link lets the owner of a board show it to anyone, and lets the project keep its own roadmap on a tiko board.

## Terms

- **Guest**: someone who opens a board by its public link without signing in. A guest only looks.
- **Demo visitor** (spec 011): a temporary person on a demo instance who can edit. Not part of this spec.

## Decisions

1. **The link is the access.** A public link holds a random token of 128 bits or more. Whoever has the link can view that one board and nothing else. There is no guest account and no session.
2. **View only, on the server.** A guest's requests go through routes of their own that can only read. No route that changes anything accepts a token.
3. **The owner decides, the admin can forbid.** Only the owner of a board turns its link on and off. An admin can switch public links off for the whole instance; they are on by default.
4. **Off means dead.** Turning a link off makes it answer like a missing board at once and closes open guest views. Turning it on again gives a new link; the old one never works again.
5. **A guest sees the board, not the people.** No cursors, names or avatars reach a guest, and a guest is not shown to the people on the board.
6. **Task data stays private.** A card from a tracker that is read with a person's token shows a guest its key and a link to the tracker, nothing else: no title, status, assignee or dates. Publishing a board never publishes what a token fetched. Demo tasks involve no token and are shown in full.
7. **Everything on the board is shown.** Frames, notes, arrows, the Gantt and other modules and board timers render for a guest, view-only. Where a module shows task data, decision 6 applies: a Gantt bar of a tracker task carries its key only.
8. **Personal tools work.** The focus timer and its music live in the browser and belong to whoever is looking, so a guest can use them. Board timers are part of the board: a guest sees them run and cannot start, stop or change them.
9. **Not for search engines.** Public pages ask not to be indexed and send no referrer, so a link does not leak through outbound clicks.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Show a board to anyone (Priority: P1) 🎯

The owner opens Share and turns on "Anyone with the link can view". A link appears with a Copy button. They send it to a client. The client opens it in a browser where nobody is signed in and sees the board: frames, notes, arrows, cards, the Gantt. They pan, zoom, open a card to read it and search the board. Nothing can be moved or changed, and a bar says "View only". Later the owner turns the link off, and the client's link shows "This board is not available."

**Why this priority**: This is the feature; everything else refines it.

**Independent Test**: as an owner turn the link on and open it in a clean browser: the board renders with no sign-in. Try every changing route with the token and without a session: each answers 401 or 404 and the board is unchanged. Open the board's ordinary address in the clean browser: sign-in is asked. Turn the link off: the clean browser shows "This board is not available." within 5 s and after a reload. Turn it on again: the old link stays dead, the new one works.

**Acceptance Scenarios**:

1. **Given** the Share dialog of a board the person owns, **Then** it has a "Public link" section with a switch, the link and Copy; an editor or a viewer sees whether the board is public but cannot change it.
2. **Given** a public link, **When** anyone opens it without a session, **Then** the board renders view-only with its name, zoom, search and theme, a "View only" mark and a "Sign in" link.
3. **Given** a guest, **Then** no toolbar, no context menu, no drag, no keyboard shortcut and no paste changes the board. The focus timer and music are offered and stay in the guest's browser.
4. **Given** a signed-in person who opens a public link, **Then** they see the same view-only page as anyone else.
5. **Given** the owner turns the link off, the board is deleted, or the admin switches public links off, **Then** the link answers like a missing board, and open guest views show "This board is not available." within 5 s.
6. **Given** an unknown or dead token, **Then** the answer is the same in body and timing as for a board that never existed.
7. **Given** a board with a public link, **Then** the board list and the top bar of the board show a "Public" mark to everyone with a role on it.
8. **Given** the admin switched public links off, **Then** the Share section says so and the switch is disabled.

### User Story 2 - The guest sees the board live (Priority: P2)

The project's roadmap board is open in a visitor's tab. A maintainer moves a card to "In progress" and adds a note. The visitor sees both without a reload.

**Why this priority**: A board that updates on its own is what sets tiko apart from a screenshot; a stale page still works, so it comes second.

**Independent Test**: open a public link in a clean browser and the board as its owner in another. Add a sticky and move a card as the owner: both appear in the guest view within 2 s. Change a demo task's status: the guest's card shows it after the next refresh. Check the guest's socket: it carries no presence, and a forged update on it changes nothing.

**Acceptance Scenarios**:

1. **Given** a guest view, **When** someone edits the board, **Then** the change appears for the guest within 2 s without a reload.
2. **Given** a guest view, **Then** task statuses refresh on the same schedule as for people on the board.
3. **Given** a guest connection, **Then** it receives no presence, sends none, and any update it sends is dropped.
4. **Given** more guests on one board than the limit allows, **Then** the next guest still gets the board, refreshed by reload only, with a note.

### Edge Cases

- A card from a tracker is, for a guest, its key as a link to the tracker; it opens no mini-card, and search on the board finds it by its key only.
- An admin switches public links off and on again: links stop while it is off and work again after; only the owner's own switch retires a link for good.
- The link is posted publicly and gets heavy traffic: each link has its own request budget, so one popular board cannot starve the instance; people who are signed in are not limited by it.
- The owner transfers the board: the link keeps working; the new owner controls it.
- An owner is disabled: their boards' links keep working until an admin or a new owner turns them off.
- A guest opens a link on a phone: the board renders and can be panned and zoomed; nothing more is promised (mobile is a Won't).
- Upgrading: no board is public after the migration.

## Requirements *(mandatory)*

- **FR-001**: A board has at most one public token, stored with the board; it is created when the owner turns the link on and removed when they turn it off.
- **FR-002**: `PUT /api/boards/{id}/public`, owner only, turns the link on or off; the board's member list answer carries the link state and the token for the owner only.
- **FR-003**: Guest routes live under `/api/public/{token}` and are the only routes open to a token: the board document, its demo tasks, their refresh and, in slice 2, a live socket. They answer what a viewer gets and nothing about members, people or settings.
- **FR-004**: A token is never accepted on any other route, and a session is never needed or used on a guest route.
- **FR-005**: An unknown token, a dead token and an instance with public links off answer with one error, `not_found`.
- **FR-006**: Turning a link off, deleting the board or switching public links off reaches open guest connections through the existing live port within 1 s.
- **FR-007**: The guest socket is read-only per connection, as a viewer's is today, and awareness is filtered out in both directions.
- **FR-008**: Guest connections have their own limit per board and do not use up the 30 connections of the people on it.
- **FR-009**: Public routes are rate limited per link: the API runs behind proxies and cannot tell guests apart by address.
- **FR-010**: The public page is served at `/p/{token}` with `X-Robots-Tag: noindex` and `Referrer-Policy: no-referrer`; links to trackers open with `rel="noreferrer"`.
- **FR-011**: An instance setting "Public links" (on by default) in Settings → Instance, admin only.
- **FR-012**: The contract change is written in `specs/012-public-link/contracts/` before the code.
- **FR-013**: No new dependency, no external service, no new ENV variable; works without keys.
- **FR-014**: The guide in `docs/guide` gets a "Public link" section, `CHANGELOG.md` a line.

## Success Criteria *(mandatory)*

- **SC-001**: From the Share dialog to a link that opens in a clean browser: two clicks.
- **SC-002**: Access matrix test: with a valid token and no session, every route outside `/api/public/{token}` answers as it does without the token, and no guest route changes a board.
- **SC-003**: Byte capture of a guest's HTTP answers and socket on a board shared by two people: no username, name, presence or tracker token appears, and no task data fetched with a person's token.
- **SC-004**: A dead link stops working for an open guest view within 5 s.
- **SC-005**: 100 guests on one board do not slow an editor on it: an edit still reaches a second editor within the bounds of spec 009.

## Slices

1. `feat/public-link` (US1): the token, Share section, guest routes, the view-only page, the instance setting, marks.
2. `feat/public-live` (US2): the guest socket and task refresh.

## Out of scope

- A link that lets a guest edit or comment; a password or an expiry date on a link.
- Embedding a board in another site (`iframe`), link previews with a board picture.
- A GitHub Issues provider and the roadmap board itself.
- A list of all public boards for the admin.
- The demo of spec 011.

## Answers from the owner (2026-10-10)

1. Cards from a personal tracker show a guest the key only (decision 6).
2. A guest sees everything on the board except task data (decision 7).
3. The focus timer and music are personal and work for a guest (decision 8).
4. Public links are allowed on an instance by default; an admin can switch them off (decision 3).
5. Demo tasks are shown to a guest in full (decision 6).
