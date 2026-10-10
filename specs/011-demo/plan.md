# Implementation Plan: Demo accounts

**Spec**: [spec.md](spec.md) | **Data**: [data-model.md](data-model.md) | **Contract**: [contracts/api.md](contracts/api.md)

## Summary

`TIKO_DEMO=1` opens one route that makes a temporary member and signs them in. A demo visitor is an ordinary `users` row with an expiry, so boards, the live socket and the welcome board need no second path. The server refuses a short list of routes to a demo visitor, a cleanup deletes the expired ones, and sign-up clears the expiry on the same row. Demo task statuses move from the provider's memory to a table keyed by person.

## Structure

```text
backend/app/config.py                 tiko_demo; start is refused with TIKO_TRACKER=jira
backend/app/domain/demo.py            DemoVisitors: create with limits, touch, cleanup, sign-up
backend/app/domain/accounts.py        Person.demo_expires_at; people and counts leave demo visitors out
backend/app/domain/sessions.py        an expired demo visitor resolves to nobody; touch once a minute
backend/app/domain/boards.py          three boards per person on a demo instance
backend/app/adapters/tasks/demo.py    statuses per person over the built-in tasks
backend/app/adapters/storage/sqlite.py  demo visitor queries, cascade delete, board list filtered in SQL
backend/app/api/auth.py               POST /auth/demo, POST /auth/signup; status and me gain demo fields
backend/app/api/gate.py               /api/auth/demo is open
backend/app/api/deps.py               NotDemoVisitor; owner and provider scoped by person on a demo instance
backend/app/api/public.py             guest routes read the owner's statuses on a demo instance
backend/app/main.py                   cleanup loop in the lifespan
frontend/nginx.conf.template          real client address, passed as X-Real-IP
frontend/src/api/auth.ts              demo fields, startDemo, signUp
frontend/src/auth/SignIn.tsx          on a demo instance "Try the demo" first, the form behind "Sign in"
frontend/src/auth/SignUp.tsx          the sign-up dialog (slice 2)
frontend/src/board/DemoBar.tsx        time left and "Sign up to keep it"
frontend/src/board/TopBar.tsx         no Share for a demo visitor; sign-out asks first
frontend/src/settings/SettingsDialog.tsx  no Security and My tracker for a demo visitor
```

## Decisions

- **The expiry is the only mark of a demo visitor.** `users.demo_expires_at` is NULL for everyone else. Sign-up sets it to NULL, the cleanup deletes rows where it is in the past, and every "is this a demo visitor" check reads this one column. There is no third role.
- **A demo visitor cannot sign in by password, by construction.** The password hash is `!`, which `verify_password` can never match, and the username starts with `~`, which the username rule does not allow. A generated name therefore never collides with a name someone picks at sign-up.
- **The session row keeps its usual 30 days.** The visitor's expiry decides: `Sessions.resolve` treats an expired demo visitor like a disabled person. The draft's 7-day cookie renewed on every request would need a second cookie path and buys nothing.
- **The touch rides on `Sessions.resolve`.** It already runs for every request and every socket. A visitor's expiry is written when the cached value is older than a minute, with `WHERE demo_expires_at IS NOT NULL`, so a touch that races with sign-up cannot bring the expiry back.
- **Restrictions are one dependency.** `NotDemoVisitor` on the sharing routes (members, "everyone", transfer, public link), the password change and the tracker token. Everything else a member can do, a demo visitor can do.
- **nginx works out the client address, the API does not parse `X-Forwarded-For`.** nginx sits in front of the API in every install. With `real_ip_header X-Forwarded-For`, `real_ip_recursive on` and `set_real_ip_from` for private ranges it takes the first address that is not a proxy on a private network, and passes it as `X-Real-IP`. A forged `X-Forwarded-For` from the internet is ignored, because the sender is not on a private network. The API reads `X-Real-IP` only when `TIKO_DEMO` is on and falls back to the peer address.
- **The instance cap is the backstop, and it evicts before it refuses.** If the address limit is dodged, 500 living demo visitors is the most the instance holds. A visitor who changed nothing is told apart in SQL (one owned board, the welcome one, at version 1), lives an hour and is deleted first when a new visitor needs a place. Only 500 visitors with real work make the button answer 429.
- **An IPv6 client is its /64.** One home connection has 2^64 addresses; the limiter keys an IPv6 address by its first 64 bits.
- **The cleanup is one SQL transaction plus the live port.** It selects expired ids, deletes their boards, members rows, sessions, credentials, snapshots and statuses, then calls `LiveBoards.end_person` for each. It is safe to run from several workers at once: the second finds nothing.
- **Statuses per person reuse the Jira scoping.** `deps._owner` returns the person's id on a demo instance, so the snapshot cache is already per person. The demo provider gets the same owner key: built-in tasks overlaid with that person's rows from `demo_statuses`. On an ordinary instance the owner stays `""` and statuses stay in memory, shared, as today.
- **A guest sees the owner's statuses.** On a demo instance the guest routes of spec 012 use the id of the board's owner as the owner key instead of `""`. Demo tasks involve no token, so decision 6 of spec 012 still holds.
- **The board list is filtered in SQL.** `SqliteBoardRepo.listing` reads every board and filters in Python today. With 1500 boards of strangers that is every board on every request, so a member's query joins on their own rows; only an admin reads the rest, without the boards owned by demo visitors.
- **The share picker needs no new input.** On a demo instance `GET /api/people/directory` answers an exact username match only, so typing a full username finds the person and nothing else is ever listed.

## Slices

| Branch | Story | Done when |
|---|---|---|
| `feat/demo-sandbox` | US1 | with `TIKO_DEMO=1` a clean browser gets its own welcome board in one click, sees the bar, cannot share, owns at most three boards, changes task statuses for itself only, and is deleted by the cleanup 7 days after its last request; with the switch off nothing changed |
| `feat/demo-signup` | US2 | a demo visitor signs up from the bar and keeps the same boards and session, can share by exact username and turn on a public link, and survives the cleanup |

## Risks

| Risk | Answer |
|---|---|
| One visitor reads another's board, person or status | access matrix over every route and the socket with two demo visitors (SC-004) |
| The demo is flooded with visitors | 5 an hour per address, 500 alive, 3 boards each; all three tested |
| A bot fills the cap with dead accounts and locks real visitors out | an account that changed nothing lives an hour and is evicted at the cap; test: 500 untouched visitors, the next one still gets in |
| A bot that also edits a board, from many addresses | costs it a socket session per account; bounded by the cap and by 3 boards of 2000 nodes; past that the answer is at the network edge, with the deployment |
| A forged address dodges the limit | nginx trusts private networks only; the API port of a demo is not published; the instance cap holds anyway |
| The cleanup leaves rows behind | a test walks every table that has a person or a board id after a cleanup (SC-005) |
| The cleanup deletes someone who just signed up | delete and touch both carry `demo_expires_at IS NOT NULL`; race test |
| The switch changes an ordinary instance | the existing suite and `make smoke` run with `TIKO_DEMO` off, unchanged (SC-003) |
| Board lists slow down with many strangers | listing filtered in SQL; measured with 500 visitors and 1500 boards (SC-006) |
| Public content from accounts made without mail | a demo visitor cannot publish; the admin's switch of spec 012 stops every link |
