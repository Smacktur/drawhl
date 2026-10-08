---
title: Security and privacy
---

drawhl is a single-user app behind one password. Every page and API route except `/health` and `/ready` asks for it, `/metrics` included.

## The password

- Set it with `DRAWHL_PASSWORD`. When it is empty, drawhl generates one on first start, prints it once to the API log (`docker compose logs api | grep 'drawhl password'`) and saves it to `data/password`.
- On Railway the template generates it: see `DRAWHL_PASSWORD` in the `api` service's Variables.
- A sign-in lasts 30 days in that browser. Changing the password and restarting signs out every browser, yours and anyone who learned the old one. Deleting `data/password` does the same with a new generated password.
- After 5 wrong passwords in a minute, sign-in pauses for the rest of that minute.
- On the open internet use HTTPS, which Railway and Render give you.

## What drawhl stores

- Your boards and settings.
- The tracker token, encrypted with `DRAWHL_SECRET_KEY`. It is never sent back to the browser or written to logs.
- A cached copy of each card's key, summary, status, type, assignee, priority and last update.

## What drawhl talks to

- The tracker URL you configure.
- The GitHub API for the latest drawhl release, unless `UPDATE_CHECK=false`. No data about you or your boards is sent.

There is no telemetry. Fonts and icons ship with the app.

Report vulnerabilities privately as described in [SECURITY.md](https://github.com/Smacktur/drawhl/blob/main/SECURITY.md), not in a public issue.
