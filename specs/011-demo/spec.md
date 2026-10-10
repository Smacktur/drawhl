# Feature Specification: Demo accounts

**Feature Branch**: `011-demo`

**Created**: 2026-10-10

**Status**: Draft, parked on 2026-10-10: the owner builds the public link ([spec 012](../012-public-link/spec.md)) first. "Guest" means the anonymous viewer of spec 012; the temporary person here is a demo visitor.

**Input**: Owner's decision at G1 on 2026-10-10: of the launch plan, build only the demo sandbox for now. "If the visitor decides to sign up, their work must be kept: moved from the demo to their account."

## Why

Nobody installs Docker to take a look. A public demo instance must let a visitor try tiko in the browser with one click, on a board of their own, without an account. A visitor who liked it should be able to keep what they made.

## Decisions

1. **One switch.** `TIKO_DEMO=1` turns the instance into a demo. Without it nothing in this spec is reachable: no demo visitor route, no sign-up, no new text on the sign-in screen.
2. **A demo visitor is a person.** A demo visitor is a row in `users` with role `member` and an expiry time, signed in by the usual session cookie. Boards, roles, real-time and the welcome board work for a demo visitor with no second code path.
3. **Sign-up converts the demo visitor in place.** The demo visitor picks a username and a password; the same row loses its expiry. Their boards never change owner, so nothing is copied or moved and nothing can be lost on the way.
4. **Demo visitors are alone.** A demo visitor cannot share a board and is never listed to anyone: not in the share picker, not in Settings → People. A demo instance has no "everyone" role.
5. **The demo tracker only.** On a demo instance the task source is the built-in demo tasks, locked the way `TIKO_TRACKER` locks it. No visitor can store a tracker token on a public server.
6. **A week of life.** A demo visitor and their boards are deleted 7 days after their last request. A person who signed up is kept for good.
7. **One instance, one database.** The demo is not a second service next to a hosted one. It is one tiko instance where a visitor starts without an account and may stay by signing up. It is still a demo: the tracker is locked to the demo tasks, so nobody connects their own Jira there.
8. **No mail, no captcha.** Abuse is held by limits on demo visitor creation and on what one demo visitor can make.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Try tiko in one click (Priority: P1) 🎯

A visitor opens the demo. The sign-in screen has a "Try the demo" button above the sign-in form. They press it and land on their own welcome board, which they can edit like any member: add cards from the demo tasks, draw frames, add a Gantt. A thin bar at the top says the board is kept for 7 days and offers "Sign up to keep it". They close the tab, come back three days later in the same browser, and the board is as they left it. Two weeks later the board is gone and the button gives them a fresh one.

**Why this priority**: This is the demo. Without it the public instance is a sign-in form.

**Independent Test**: start with `TIKO_DEMO=1`. In a clean browser press "Try the demo": the welcome board opens and takes edits. In a second clean browser do the same: it gets a different board and sees nothing of the first. Move the clock 8 days forward and run the cleanup: the first demo visitor's cookie no longer signs in, their boards are gone from the database. Start without `TIKO_DEMO`: the button is absent and the demo visitor route answers 404.

**Acceptance Scenarios**:

1. **Given** a demo instance and a visitor with no session, **When** they press "Try the demo", **Then** a demo visitor is created, a session starts and the welcome board opens.
2. **Given** a demo visitor, **Then** every board screen shows the demo bar with the time left and "Sign up to keep it".
3. **Given** a demo visitor, **Then** Share, Settings → Security, Settings → My tracker and invites are not offered, and their routes answer 403 for a demo visitor.
4. **Given** any person on a demo instance, **Then** the people list and the share picker contain no demo visitors, and the "everyone" role cannot be set.
5. **Given** a demo visitor whose last request was more than 7 days ago, **Then** the cleanup deletes the demo visitor, their sessions and their boards and closes their open sockets.
6. **Given** more demo visitors created from one address than the limit allows, or the instance at its demo visitor cap, **Then** the button answers 429 with a message to try later; signing in still works.
7. **Given** a demo visitor who presses "Sign out", **Then** the browser asks first: the board cannot be reached again.
8. **Given** an instance without `TIKO_DEMO`, **Then** its behavior and its API are unchanged.

### User Story 2 - Keep the work by signing up (Priority: P2)

The visitor spent twenty minutes on a board and wants to keep it. They press "Sign up to keep it", enter a name, a username and a password, and stay on the same board. The bar is gone. Their boards are there the next week, on any device, after an ordinary sign-in.

**Why this priority**: It turns a look into a user, and losing work on sign-up is the worst first impression.

**Independent Test**: as a demo visitor make two boards and add a sticky to each. Sign up. Without a reload the bar disappears and both boards are listed. Sign out, sign in with the new username and password in another browser: both boards and both stickies are there. Move the clock 8 days forward and run the cleanup: the account and the boards remain.

**Acceptance Scenarios**:

1. **Given** a demo visitor, **When** they sign up with a free username and a valid password, **Then** the same person becomes a regular member, keeps the session, and owns every board they made as a demo visitor.
2. **Given** a taken username or a weak password, **Then** the form shows the same errors as an invite does and the demo visitor stays a demo visitor.
3. **Given** a signed-up person, **Then** the cleanup never touches them, and Share and Settings → Security work for them.
4. **Given** a person who is not a demo visitor, or an instance without `TIKO_DEMO`, **Then** the sign-up route answers 404.
5. **Given** a demo visitor with a board open in two tabs, **When** they sign up in one, **Then** the other tab loses the bar on its next request, without being signed out.

### Edge Cases

- The demo visitor clears cookies: the board cannot be reached and is deleted by the cleanup. The sign-out prompt says so.
- A demo visitor's session cookie lasts 7 days and is renewed with the demo visitor's life, so the cookie and the demo visitor end together.
- Sign-up and the cleanup race: sign-up wins if it commits first; the cleanup deletes only rows that still have an expiry.
- A signed-up person shares a board on the demo: by exact username only; the picker does not list other people on a demo instance.
- Demo task statuses are one set for the whole instance today; see "Demo task statuses per person".
- The demo instance restarts: demo visitors and their boards survive, like everyone else's.

## Requirements *(mandatory)*

- **FR-001**: `TIKO_DEMO` (default off) in `config.py`, `.env.example` and the README. With it on, the task source is the demo tasks and is locked.
- **FR-002**: `GET /api/auth/status` tells the web app that the instance is a demo, and `me` says whether the person is a demo visitor and when the demo visitor expires.
- **FR-003**: `POST /api/auth/demo`, open without a session on a demo instance only, creates a demo visitor and starts a session. A request that already has a session gets that session back and creates nothing.
- **FR-004**: A demo visitor has a generated username and name and no usable password: sign-in by password is impossible for a demo visitor.
- **FR-005**: Every request of a demo visitor moves their expiry to 7 days from now, at most once a minute per demo visitor.
- **FR-006**: A cleanup runs at start and every 10 minutes: it deletes expired demo visitors with their boards, members rows, sessions and cached data in one transaction and ends their sockets through the existing live port.
- **FR-007**: Limits: 5 demo visitors per hour per client address, 500 demo visitors alive on the instance, 5 boards per demo visitor. Each answers with its own error code and message.
- **FR-008**: The client address is read from `X-Forwarded-For` only when `TIKO_DEMO` is on; the demo is expected to sit behind one trusted proxy.
- **FR-009**: `POST /api/auth/signup`, for a demo visitor on a demo instance only: name, username, password under the rules of spec 008. It clears the expiry, sets the credentials and keeps the current session.
- **FR-010**: Demo visitors are excluded from the people list, the share picker and the active-admin and people counts. On a demo instance the share picker lists nobody, a share needs an exact username, and the "everyone" role is refused.
- **FR-011**: Demo visitor restrictions are enforced on the server; the web app only hides what the server refuses.
- **FR-012**: The contract change is written in `specs/011-demo/contracts/` before the code.
- **FR-013**: No new dependency and no external service; works without keys.

## Success Criteria *(mandatory)*

- **SC-001**: From opening the demo to an editable board: one click and under 3 seconds on a warm instance.
- **SC-002**: A demo visitor's boards after sign-up are byte-for-byte the boards before it: same ids, same content, same version.
- **SC-003**: With `TIKO_DEMO` off, the existing test suite and `make smoke` pass unchanged, and the two new routes answer 404.
- **SC-004**: No request of one demo visitor returns a board, a person or a presence entry of another demo visitor (access matrix test over every route and the socket).
- **SC-005**: After the cleanup no row in any table refers to a deleted demo visitor.

## Slices

1. `feat/demo-sandbox` (US1): the switch, demo visitor creation, the bar, restrictions, limits, cleanup.
2. `feat/demo-signup` (US2): sign-up in place.

## Out of scope

- Deploying the demo, its domain and proxy, Privacy and Terms pages. The legal gate requires Privacy and Terms before a demo instance goes public.
- A public read-only board link, a GitHub Issues provider, a landing page.
- Moving a board from the demo to a self-hosted instance (export and import).
- Mail, password reset by mail, captcha, deleting inactive signed-up accounts.
- Open sign-up on an ordinary instance: people still join by invite.

## Demo task statuses per person

The owner wants a status changed by one visitor not to change for the others. Decided in principle on 2026-10-10; whether it ships with slice 1 is settled when the spec is taken off the shelf.

Today `DemoTaskProvider` keeps one set of statuses in memory for the instance, and the task cache of the demo tracker is shared (owner `""`), while the Jira cache is already kept per person.

What it takes:

- The demo provider keeps the changed statuses per person (key to status) over the built-in tasks; `set_status`, `resolve`, `poll` and `search` take the person's id.
- On a demo instance the task cache is scoped by person, the way it is for Jira; `deps._owner` already has the switch.
- Changed statuses are stored in a table so they survive a restart, and the cleanup deletes them with the visitor.
- Two people on one shared board each see their own statuses, as they do with Jira tokens.

Cost: about half a day with tests, inside slice 1. Resources: a changed status is one short row; the cache is about 1 KB per task per person, so 10,000 people with 30 tasks each is about 30 MB of SQLite. No extra memory or CPU worth counting.

## Answers from the owner (2026-10-10)

1. People who signed up on the demo are kept for good.
2. A demo visitor lives 7 days after their last request.
3. Demo task statuses should be per person; see the section above.
