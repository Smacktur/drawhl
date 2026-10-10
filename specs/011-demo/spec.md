# Feature Specification: Demo accounts

**Feature Branch**: `011-demo`

**Created**: 2026-10-10

**Status**: Approved at G2 on 2026-10-11. Drafted and parked on 2026-10-10, taken off the shelf after [spec 012](../012-public-link/spec.md) shipped. "Guest" means the anonymous viewer of spec 012; the temporary person here is a demo visitor.

**Input**: Owner's decision at G1 on 2026-10-10: of the launch plan, build only the demo sandbox for now. "If the visitor decides to sign up, their work must be kept: moved from the demo to their account."

## Why

Nobody installs Docker to take a look. A public demo instance must let a visitor try tiko in the browser with one click, on a board of their own, without an account. A visitor who liked it should be able to keep what they made.

## Decisions

1. **One switch.** `TIKO_DEMO=1` turns the instance into a demo. Without it nothing in this spec is reachable: no demo visitor route, no sign-up, no new text on the sign-in screen.
2. **A demo visitor is a person.** A demo visitor is a row in `users` with role `member` and an expiry time, signed in by the usual session cookie. Boards, roles, real-time and the welcome board work for a demo visitor with no second code path.
3. **Sign-up converts the demo visitor in place.** The demo visitor picks a username and a password; the same row loses its expiry. Their boards never change owner, so nothing is copied or moved and nothing can be lost on the way.
4. **Demo visitors are alone.** A demo visitor cannot share a board, cannot turn on its public link and is never listed to anyone: not in the share picker, not in Settings → People. A demo instance has no "everyone" role.
5. **The demo tracker only.** On a demo instance the task source is the built-in demo tasks, locked the way `TIKO_TRACKER` locks it. Nobody can store a tracker token on a public server.
6. **A week of life.** A demo visitor and their boards are deleted 7 days after their last request; a demo visitor who changed nothing, an hour after it. A person who signed up is kept for good.
7. **One instance, one database.** The demo is not a second service next to a hosted one. It is one tiko instance where a visitor starts without an account and may stay by signing up. It is still a demo: the tracker is locked to the demo tasks, so nobody connects their own Jira there.
8. **No mail, no captcha.** Abuse is held by limits on demo visitor creation and on what one person can make: three boards each, for a demo visitor and after sign-up alike. A bot that presses the button leaves accounts that changed nothing: they go within the hour, and they are the first to go when the instance is full, so they cannot keep real visitors out.
9. **Task statuses are personal.** On a demo instance a status changed by one person changes for that person only. Strangers on one server never see each other's edits, on boards or in tasks.
10. **A public link is for those who stayed.** A signed-up person turns on the public link of their board as on any instance (spec 012). The admin's instance switch stays the way to stop it.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Try tiko in one click (Priority: P1) 🎯

A visitor opens the demo. The first screen is about the demo, not about signing in: the name, one line on what tiko is, a large "Try the demo" button and "No account needed. Your board is kept for 7 days." The sign-in form is behind an "Already have an account? Sign in" link. They press the button and land on their own welcome board, which they can edit like any member: add cards from the demo tasks, change a task's status, draw frames, add a Gantt. A thin bar at the top says the board is kept for 7 days and offers "Sign up to keep it". They close the tab, come back three days later in the same browser, and the board is as they left it. Two weeks later the board is gone and the button gives them a fresh one.

**Why this priority**: This is the demo. Without it the public instance is a sign-in form.

**Independent Test**: start with `TIKO_DEMO=1`. In a clean browser press "Try the demo": the welcome board opens and takes edits. In a second clean browser do the same: it gets a different board and sees nothing of the first. Change the status of `DEMO-1` in the first browser: the second still shows the old one after a refresh. Move the clock 8 days forward and run the cleanup: the first demo visitor's cookie no longer signs in, their boards are gone from the database. Start without `TIKO_DEMO`: the button is absent and the demo visitor route answers 404.

**Acceptance Scenarios**:

1. **Given** a demo instance and a visitor with no session, **Then** the first screen shows "Try the demo" and no username or password field; "Sign in" opens the usual form. **When** they press "Try the demo", **Then** a demo visitor is created, a session starts and the welcome board opens.
2. **Given** a demo visitor, **Then** every board screen shows the demo bar with the time left; "Sign up to keep it" joins it with slice 2.
3. **Given** a demo visitor, **Then** Share with its public link, Settings → Security, Settings → My tracker and invites are not offered, and their routes answer 403 for a demo visitor.
4. **Given** any person on a demo instance, **Then** the people list and the share picker contain no demo visitors, and the "everyone" role cannot be set.
5. **Given** a demo visitor whose last request was more than 7 days ago, **Then** the cleanup deletes the demo visitor, their sessions, their boards and their task statuses and closes their open sockets.
6. **Given** more demo visitors created from one address than the limit allows, **Then** the button answers 429 with a message to try later; signing in still works. **Given** the instance at its demo visitor cap, **Then** demo visitors who changed nothing are deleted to make room, the longest idle first, and the button answers 429 only when every one of them has work on a board.
7. **Given** a demo visitor who presses "Sign out", **Then** the browser asks first: the board cannot be reached again.
8. **Given** a person on a demo instance who owns three boards and is not an admin, **When** they make a fourth, **Then** it is refused with a message that says why; the welcome board counts as one of the three.
9. **Given** two people on a demo instance, **When** one changes the status of a demo task, **Then** the other's cards, search and Gantt keep the status they had.
10. **Given** an instance without `TIKO_DEMO`, **Then** its behavior and its API are unchanged.

### User Story 2 - Keep the work by signing up (Priority: P2)

The visitor spent twenty minutes on a board and wants to keep it. They press "Sign up to keep it", enter a name, a username and a password, and stay on the same board. The bar is gone. Their boards are there the next week, on any device, after an ordinary sign-in.

**Why this priority**: It turns a look into a user, and losing work on sign-up is the worst first impression.

**Independent Test**: as a demo visitor make two boards, add a sticky to each and change the status of a demo task. Sign up. Without a reload the bar disappears and both boards are listed. Sign out, sign in with the new username and password in another browser: both boards, both stickies and the changed status are there. Turn on the public link of one board: it opens in a clean browser. Move the clock 8 days forward and run the cleanup: the account and the boards remain.

**Acceptance Scenarios**:

1. **Given** a demo visitor, **When** they sign up with a free username and a valid password, **Then** the same person becomes a regular member, keeps the session, and owns every board they made as a demo visitor.
2. **Given** a taken username or a weak password, **Then** the form shows the same errors as an invite does and the demo visitor stays a demo visitor.
3. **Given** a signed-up person, **Then** the cleanup never touches them, and Share, the public link and Settings → Security work for them. The limit of three boards stays.
4. **Given** a person who is not a demo visitor, or an instance without `TIKO_DEMO`, **Then** the sign-up route answers 404.
5. **Given** a demo visitor with a board open in two tabs, **When** they sign up in one, **Then** the other tab loses the bar on its next request, without being signed out.
6. **Given** a signed-up person on a demo instance, **When** they share a board, **Then** the picker finds another person by their exact username only and lists nobody otherwise.

### Edge Cases

- A bot presses the button from many addresses: each account it leaves has only an untouched welcome board, lives an hour and gives its place to the next real visitor at once when the instance is full.
- A visitor looks around without changing anything and comes back the next day: they get a fresh welcome board, which is what they had.
- The demo visitor clears cookies: the board cannot be reached and is deleted by the cleanup. The sign-out prompt says so.
- The session ends with the demo visitor: once the visitor expired, their cookie signs nobody in, whatever its own lifetime.
- A board left open in a tab keeps asking for task updates, so its demo visitor stays alive while the tab is open.
- Sign-up and the cleanup race: sign-up wins if it commits first; the cleanup deletes only rows that still have an expiry.
- A signed-up person shares a board with another: each sees their own task statuses on it, as two people with their own Jira tokens do.
- A guest of a public link on a demo instance sees the task statuses of the board's owner.
- An admin on a demo instance is not limited in boards. Their list of other people's boards leaves out the boards of demo visitors; a board opened by its address still works for them.
- `TIKO_DEMO` together with `TIKO_TRACKER=jira`: the instance does not start and says why.
- The demo instance restarts: demo visitors, their boards and their task statuses survive, like everyone else's.
- `TIKO_DEMO` is turned off on an instance that has demo visitors: they stop being able to sign in and stay in the database until it is turned on again and the cleanup runs.

## Requirements *(mandatory)*

- **FR-001**: `TIKO_DEMO` (default off) in `config.py`, `.env.example` and the README. With it on, the task source is the demo tasks and is locked, and no route stores a tracker token.
- **FR-002**: `GET /api/auth/status` tells the web app that the instance is a demo, and `me` says whether the person is a demo visitor and when the demo visitor expires.
- **FR-003**: `POST /api/auth/demo`, open without a session on a demo instance only, creates a demo visitor and starts a session. A request that already has a session gets that session back and creates nothing.
- **FR-004**: A demo visitor has a generated username and name and no usable password: sign-in by password is impossible for a demo visitor, and a generated username can never take a name someone could choose.
- **FR-005**: Every request of a demo visitor moves their expiry to 7 days from now, or to 1 hour from now while they have changed nothing, at most once a minute per demo visitor. A demo visitor has changed nothing while the only board they own is the welcome board as it was made. An expired demo visitor is refused like a signed-out one, before the cleanup reaches them.
- **FR-006**: A cleanup runs at start and every 10 minutes: it deletes expired demo visitors with their boards, members rows, sessions, task statuses and cached data in one transaction and ends their sockets through the existing live port.
- **FR-007**: Limits: 5 demo visitors per hour per client address, 500 demo visitors alive on the instance, 3 boards owned per person who is not an admin. Each answers with its own error code and message. The limits are constants, not settings. An IPv6 client is counted by its /64 network, not by its address. At the instance cap a new demo visitor takes the place of one who changed nothing, the longest idle first; the cap refuses only when there is none.
- **FR-008**: The client address is worked out by the web container's nginx, which trusts forwarded addresses from private networks only, and reaches the API in one header that the API reads only when `TIKO_DEMO` is on. The API port of a demo instance is not published.
- **FR-009**: `POST /api/auth/signup`, for a demo visitor on a demo instance only: name, username, password under the rules of spec 008. It clears the expiry, sets the credentials and keeps the current session.
- **FR-010**: Demo visitors are excluded from the people list, the share picker, the active-admin and people counts and the admin's list of other people's boards. On a demo instance the share picker answers an exact username only, and the "everyone" role is refused.
- **FR-011**: Demo visitor restrictions are enforced on the server; the web app only hides what the server refuses.
- **FR-012**: On a demo instance changed task statuses are kept per person and survive a restart; the task cache is scoped by person, as it is for Jira. The guest routes of spec 012 read the statuses of the board's owner. On an ordinary instance the demo tasks stay shared, as today.
- **FR-013**: The contract change is written in `specs/011-demo/contracts/` before the code.
- **FR-014**: No new dependency and no external service; works without keys.
- **FR-015**: The guide in `docs/guide` gets `TIKO_DEMO` in Configuration and a page on running a demo; `CHANGELOG.md` a line per slice.

## Success Criteria *(mandatory)*

- **SC-001**: From opening the demo to an editable board: one click and under 3 seconds on a warm instance.
- **SC-002**: A demo visitor's boards after sign-up are byte-for-byte the boards before it: same ids, same content, same version.
- **SC-003**: With `TIKO_DEMO` off, the existing test suite and `make smoke` pass unchanged, and the two new routes answer 404.
- **SC-004**: No request of one demo visitor returns a board, a person, a presence entry or a changed task status of another demo visitor (access matrix test over every route and the socket).
- **SC-005**: After the cleanup no row in any table refers to a deleted demo visitor.
- **SC-006**: With 500 demo visitors and 1500 boards in the database, a demo visitor's board list answers within 100 ms.

## Slices

1. `feat/demo-sandbox` (US1): the switch, demo visitor creation, the bar, restrictions, limits, cleanup, personal task statuses.
2. `feat/demo-signup` (US2): sign-up in place, sharing by exact username.

## Out of scope

- Deploying the demo, its domain and proxy, Privacy and Terms pages and the links to them on the sign-up form. The legal gate requires Privacy and Terms before a demo instance goes public.
- A GitHub Issues provider, a landing page, the roadmap board.
- Moving a board from the demo to a self-hosted instance (export and import).
- Mail, password reset by mail, captcha.
- Open sign-up on an ordinary instance: people still join by invite.
- Personal demo task statuses on an ordinary instance.
- Settings for the limits.
- Protection at the network edge (a bot filter, a challenge, rate limits by the proxy): it belongs to the deployment of the demo.

## Answers from the owner

2026-10-10:

1. People who signed up on the demo are kept for good.
2. A demo visitor lives 7 days after their last request.
3. Demo task statuses should be per person.

2026-10-11:

4. A demo visitor cannot turn on a public link; a signed-up person can (decision 10).
5. Personal task statuses ship in slice 1 (decision 9).
6. Three boards for everyone who came in through the demo, before and after sign-up; five or more is too many. The welcome board is one of the three (decision 8).
7. The demo stays as specified, with sign-up. A public link that lets a guest edit does not replace it: one board for a crowd, and a token that can write on every install.
8. The first screen of a demo instance puts "Try the demo" first and the sign-in form behind a link.
9. Approved at G2. Asked about bots that breed dead accounts: answered with the one-hour life of an account that changed nothing, eviction at the cap and counting IPv6 by /64.
10. Slice `feat/demo-sandbox` approved at G3.
11. On a demo instance a signed-up account that nobody signed in to for 90 days is deleted with its boards; built in `feat/demo-signup`. This replaces answer 1 for accounts left unused.
