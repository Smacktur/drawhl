---
title: Security and privacy
---

Every page and API route except `/health` and `/ready` asks you to sign in with a username and password, `/metrics` included.

## Signing in

- The first account is `admin`. Its password is `DRAWHL_PASSWORD`; when that is empty, drawhl generates one on first start, prints it once to the API log (`docker compose logs api | grep 'drawhl password'`) and saves it to `data/password`.
- On Railway the template generates it: see `DRAWHL_PASSWORD` in the `api` service's Variables.
- Once the account exists, `DRAWHL_PASSWORD` and `data/password` are no longer read. Change your name and username in Settings → Profile and your password in Settings → Security.
- A sign-in lasts 30 days in that browser. Changing your password signs out your other devices; "Sign out everywhere" in Settings → Security signs out all of them.
- Passwords are stored as salted scrypt hashes, and sessions as hashes of their tokens.
- After 10 wrong passwords for one username in 15 minutes, sign-in for that username pauses until the window passes.
- On the open internet use HTTPS, which Railway and Render give you.

## People

- An admin invites people in Settings → People: "Invite" gives a link to send in a chat. It works once and expires in 7 days. The person picks a username, a name and a password and is signed in. drawhl sends no mail.
- From a person's menu an admin makes them admin or member, disables them (they are signed out at once and cannot sign in) or creates a password reset link that works once within 24 hours.
- Only the hash of a link's token is stored, so a link is shown once. Unused links are listed under "Open links" and can be revoked.
- There is always at least one active admin. If the only admin forgets their password, run `docker compose exec api python -m app.reset_password admin` (or the username) and open the printed link on your drawhl address.

## Sharing boards

- A board belongs to the person who made it. "Share" in the top bar lists who has access; the owner adds people as "Can edit" or "Can view", removes them, makes someone else the owner, or opens the board to "Everyone in drawhl".
- Editors change the board and its name. Viewers see it with a "View only" badge: no toolbar, nothing moves or changes, and the server refuses their saves. Only the owner deletes a board or changes who has access.
- A board you cannot open is not in your list, and its link answers as if it did not exist.
- Admins act as owner on every board, so a board is never stranded when its owner is disabled. Boards nobody shared with them are under "All boards" in the board menu.
- Each new person gets their own welcome board once.
- Task data on cards still comes from the instance's tracker connection; per-person tracker tokens are next.

## What drawhl stores

- Your boards, settings and account: username, name and password hash.
- The tracker token, encrypted with `DRAWHL_SECRET_KEY`. It is never sent back to the browser or written to logs.
- A cached copy of each card's key, summary, status, type, assignee, priority and last update.

## What drawhl talks to

- The tracker URL you configure.
- The GitHub API for the latest drawhl release, unless `UPDATE_CHECK=false`. No data about you or your boards is sent.

There is no telemetry. Fonts and icons ship with the app.

Report vulnerabilities privately as described in [SECURITY.md](https://github.com/Smacktur/drawhl/blob/main/SECURITY.md), not in a public issue.
