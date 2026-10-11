# Implementation Plan: Demo visitor

**Spec**: [spec.md](spec.md) | **Contract**: [contracts/api.md](contracts/api.md)

## Summary

The switch `TIKO_DEMO` keeps what makes strangers safe from each other. What a visitor may not do is asked of the person (`demo_expires_at`), not of the instance. The data model does not change.

## Structure

```text
backend/app/config.py          TIKO_DEMO starts with a tracker; TIKO_BOARD_LIMIT
backend/app/main.py            the tracker environment without the demo lock
backend/app/api/deps.py        tracker(): demo for a visitor, the instance's for the rest
backend/app/api/boards.py      default source and refresh by tracker(); the board limit
backend/app/api/settings.py    a visitor's view; the test route
backend/app/api/me.py          a visitor's tracker; the token route
backend/app/domain/demo.py     check_board_limit with the instance's limit
backend/app/domain/boards.py   the welcome note by person
```

## Decisions

- **One function answers "which tracker".** `deps.tracker` is the only place that knows a visitor is on the demo tasks; providers, the default source of a board, the refresh and the two settings views read it.
- **The default source of a board follows who reads it.** New cards name their source since spec 013, so a visitor's cards stay demo cards when the default becomes Jira after sign-up.
- **A visitor's settings answer is rewritten at the route.** `SettingsService` stays unaware of visitors; the route blanks the tracker fields.
- **The test route is closed further than the spec of the demo needed.** It makes the server call an address. On an instance where anyone becomes a person in one click, a chosen address is an admin's right and a visitor has no call at all.
- **The board limit is read at the route.** The domain function takes the instance's number; a visitor's three stays a constant next to the other demo limits.

## Slices

| Branch | Story | Done when |
|---|---|---|
| `feat/demo-visitor` | US1 | an instance with `TIKO_DEMO=1` and Jira starts; a visitor sees demo tasks only and no Jira address; after sign-up the person stores a token and adds a Jira task; `TIKO_BOARD_LIMIT` holds |
| `feat/demo-entry` | US2 | the root of an open instance is the sign-in form with a link, `/demo` holds the button |

## Risks

| Risk | Answer |
|---|---|
| A visitor reaches the instance's tracker | every task route goes through `deps.tracker`; tests on an instance set to Jira |
| The tracker address leaks to anonymous people | a visitor's settings and tracker answers carry none; byte test |
| The server is made to call a chosen address | the test route refuses visitors, and an address from a member |
| An instance set up for spec 011 loses its board limit for members | the demo has not been released; the guide names `TIKO_BOARD_LIMIT=3` |
