---
title: Running a demo
description: Turn a tiko instance into a public demo where anyone starts in one click, without an account.
---

A demo is an ordinary tiko instance started with `TIKO_DEMO=1`. Its first screen offers "Try the demo" instead of the sign-in form. One click gives the visitor a board of their own with the sample tasks, and nobody else sees it.

```sh
# .env
TIKO_DEMO=1
```

The instance then runs on the demo tasks only. `TIKO_DEMO=1` together with `TIKO_TRACKER=jira` stops the start, and nobody can store a tracker token.

## What a visitor gets

- A temporary account made by the button: no username, no password, a session cookie in their browser.
- The welcome board and up to three boards in all.
- Their own task statuses: a status one visitor changes stays as it was for everyone else.
- Seven days. Each visit starts the count again; after seven days away the visitor and their boards are deleted.

A visitor cannot share a board, turn on a public link, change a name or a password, or reach Settings → Security and My tracker. A visitor who signs out, or clears cookies, cannot open their boards again.

## Signing up

The top bar shows "Demo · 7 days", the time the boards are still kept. "Sign up to keep it" next to it asks for a name, a username and a password. The visitor becomes a regular member on the spot: the same boards, the same task statuses, the same session, and no seven-day clock. From then on they sign in from any device, share boards and turn on public links. The limit of three boards stays.

On a demo instance the share picker finds a person by their whole username only, so strangers are not listed to each other.

There is no mail on a demo, so a forgotten password cannot be reset by the person; an admin can make a reset link in Settings → People. An account that nobody signed in to for 90 days is deleted with its boards. Admins are never deleted.

## Limits

They are fixed, not settings:

| Limit | Value |
|---|---|
| New visitors from one address | 5 an hour; an IPv6 /64 network counts as one address |
| Visitors on the instance | 500 |
| Boards per person, admins aside | 3 |

A visitor who changed nothing is deleted an hour after their last request, and is the first to give up their place when the instance is full. A script that only presses the button therefore cannot keep people out: "The demo is full" shows only when 500 visitors have real work on a board.

## Before you publish it

- Publish the web port only. The API reads the visitor's address from a header that the web container sets; whoever reaches the API port directly can set it themselves. `compose.release.yml` already keeps the API port inside.
- Put tiko behind a proxy on the same host or private network. The web container believes forwarded addresses only from private networks, so the address limit counts real visitors.
- Admins are not limited and still sign in from "Already have an account? Sign in". They see people who signed up, not visitors, and their list of other people's boards leaves visitors' boards out.
- A demo collects what visitors put on their boards. Publish a privacy notice and terms with it.
