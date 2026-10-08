---
title: Security and privacy
---

Every page and API route except `/health` and `/ready` asks you to sign in with a username and password, `/metrics` included.

## Signing in

- The first account is `admin`. Its password is `DRAWHL_PASSWORD`; when that is empty, drawhl generates one on first start, prints it once to the API log (`docker compose logs api | grep 'drawhl password'`) and saves it to `data/password`.
- On Railway the template generates it: see `DRAWHL_PASSWORD` in the `api` service's Variables.
- Once the account exists, `DRAWHL_PASSWORD` and `data/password` are no longer read. Change the password, name and username in Settings → My account.
- A sign-in lasts 30 days in that browser. Changing your password signs out your other devices; "Sign out everywhere" in Settings signs out all of them.
- Passwords are stored as salted scrypt hashes, and sessions as hashes of their tokens.
- After 10 wrong passwords for one username in 15 minutes, sign-in for that username pauses until the window passes.
- On the open internet use HTTPS, which Railway and Render give you.

## What drawhl stores

- Your boards, settings and account: username, name and password hash.
- The tracker token, encrypted with `DRAWHL_SECRET_KEY`. It is never sent back to the browser or written to logs.
- A cached copy of each card's key, summary, status, type, assignee, priority and last update.

## What drawhl talks to

- The tracker URL you configure.
- The GitHub API for the latest drawhl release, unless `UPDATE_CHECK=false`. No data about you or your boards is sent.

There is no telemetry. Fonts and icons ship with the app.

Report vulnerabilities privately as described in [SECURITY.md](https://github.com/Smacktur/drawhl/blob/main/SECURITY.md), not in a public issue.
