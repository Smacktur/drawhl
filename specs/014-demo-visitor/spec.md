# Feature Specification: Demo visitor

**Feature Branch**: `014-demo-visitor`

**Created**: 2026-10-11

**Status**: Owner told the agent on 2026-10-11 to build slice 1 without waiting; shown at G3.

**Input**: Owner's decisions on 2026-10-11, after [spec 011](../011-demo/spec.md) shipped: the limits of a demo belong to the visitor, the instance keeps its tracker. Strangers still do not see each other, unused accounts still go after 90 days, and the number of boards a person holds becomes a setting of the instance. The demo button moves to an address of its own.

## Why

Spec 011 made `TIKO_DEMO=1` a mode of the whole instance: the tracker is locked on the demo tasks, nobody stores a token, everyone holds three boards. Such an instance can show tiko and cannot be worked on. Someone who signed up after the demo has to install tiko elsewhere and start again to see their own tasks.

The limits were meant for a person who has no account yet. Tied to that person, they let one instance do both jobs: a visitor tries tiko on the demo tasks, signs up, connects their tracker and goes on with the same boards.

## Terms

- **Demo visitor**: as in spec 011, a temporary person made by "Try the demo", until they sign up.
- **Open instance**: an instance started with `TIKO_DEMO=1`. People on it did not invite each other.

## Decisions

1. **The tracker is the instance's again.** `TIKO_DEMO=1` no longer locks the tracker and starts together with `TIKO_TRACKER=jira`. An admin sets the tracker as on any instance.
2. **A visitor works on the demo tasks only.** Whatever the instance is set to, a visitor's keys and queries go to the demo tasks, and the instance's tracker address is not shown to them. They cannot store or test a token.
3. **Sign-up opens the tracker.** After sign-up the person sees the instance's tracker and connects their own token. Cards from the demo days stay demo cards.
4. **Rules of an open instance hold for everyone on it**: a person is found by their whole username only, there is no "everyone" role, an account nobody signed in to for 90 days is deleted, and demo task statuses are each person's own. These do not change.
5. **Boards per person is a setting.** A visitor holds three boards. For people with an account the instance sets `TIKO_BOARD_LIMIT`; empty means no limit, on any instance. Admins are not limited.
6. **The demo note is the visitor's.** Only a visitor's welcome board says "This is a demo"; a person with an account gets the note about connecting a tracker.
7. **The demo has its own address.** The first screen of an open instance is the sign-in form with a link to the demo; `/demo` holds the "Try the demo" button. A visitor is still made by the button, not by opening the page.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The limits follow the visitor (Priority: P1) 🎯

A team runs tiko with Jira and turns the demo on. A visitor presses "Try the demo", gets the welcome board with demo tasks and adds `DEMO-5`. Settings show them no tracker. They sign up, open Settings → My tracker, paste a Jira token and add a card of their own project next to the demo cards. Their colleagues on the same instance work with Jira all along.

**Why this priority**: without it a demo instance is good for nothing but the demo.

**Independent Test**: start an instance with `TIKO_DEMO=1`, `TIKO_TRACKER=jira` and a Jira address. As a visitor: a demo key resolves, a Jira key does not, no answer carries the Jira address, a token is refused. Sign up: the Jira address shows, the token is stored, a Jira key resolves, the demo cards keep their data. As an admin on the same instance: Jira works as without the demo.

**Acceptance Scenarios**:

1. **Given** `TIKO_DEMO=1` with `TIKO_TRACKER=jira`, **Then** the instance starts.
2. **Given** a visitor on an instance set to Jira, **Then** settings answer them the demo tracker with no address, typed keys and queries go to the demo tasks, and their board syncs the demo tasks only.
3. **Given** a visitor, **When** they store or test a token, **Then** the answer is 403 "Sign up to do this."
4. **Given** a person who signed up, **Then** they see the instance's tracker, store their token and add its tasks; the demo cards on their boards still show.
5. **Given** a person who is not an admin, **When** they test a connection to an address of their own choice, **Then** the answer is 403: only an admin picks the address the server calls.
6. **Given** `TIKO_BOARD_LIMIT=2`, **Then** a person with an account who owns two boards cannot make a third, a visitor still holds three, an admin any number. Without the variable only visitors are limited.
7. **Given** an open instance, **Then** a visitor's welcome board carries the demo note and an admin's or a member's does not.

### User Story 2 - The demo at its own address (Priority: P2)

Someone who already has an account opens the instance and signs in. Someone who came to look opens `/demo` and presses the one button.

**Why this priority**: the sign-in form behind a link is in the way of people who work on the instance every day; it still works, so it comes second.

**Independent Test**: on an open instance the root shows the sign-in form with a link "Try the demo"; `/demo` shows the button; opening `/demo` creates nobody, pressing the button does. On an instance without `TIKO_DEMO` there is no link and `/demo` shows the sign-in form.

## Requirements *(mandatory)*

- **FR-001**: `TIKO_DEMO` MUST NOT set or lock the tracker.
- **FR-002**: A visitor's task requests MUST reach the demo tasks only, and no answer to a visitor carries the instance's tracker address or a token state other than `none`.
- **FR-003**: `PUT /me/tracker` and `POST /settings/jira/test` MUST refuse a visitor.
- **FR-004**: `POST /settings/jira/test` MUST refuse an address from anyone but an admin.
- **FR-005**: `TIKO_BOARD_LIMIT` MUST cap the boards owned by a person who is neither an admin nor a visitor; a visitor's cap stays three.
- **FR-006**: The directory rule, the missing "everyone" role, the 90 days and the personal demo statuses of spec 011 MUST stay as they are on an instance with `TIKO_DEMO=1`.
- **FR-007**: (US2) An open instance MUST show the sign-in form first and the demo button at `/demo`.

## Success Criteria *(mandatory)*

- **SC-001**: On one instance a visitor on the demo tasks and a member on Jira work at the same time; the visitor's answers never contain the Jira address or a Jira task.
- **SC-002**: A visitor who signs up adds a task of their own tracker to a board from the demo days without leaving the instance.

## Out of scope

- Signing up without the demo first, and rules for usernames and passwords of people nobody invited.
- A tracker per person or per group; the instance still has one.
- Limits other than the number of boards.
