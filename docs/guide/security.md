---
title: Security and privacy
category:
  uri: Self-hosting
position: 3
---

drawhl is a single-user app and **has no login yet**. Anyone who can open its URL sees your boards and can search your tracker with your token. Run it on your own machine or home network, or reach it through a VPN such as Tailscale. If you expose it beyond that, put it behind a reverse proxy that adds authentication.

## What drawhl stores

- Your boards and settings.
- The tracker token, encrypted with `DRAWHL_SECRET_KEY`. It is never sent back to the browser or written to logs.
- A cached copy of each card's key, summary, status, type, assignee, priority and last update.

## What drawhl talks to

- The tracker URL you configure.
- The GitHub API for the latest drawhl release, unless `UPDATE_CHECK=false`. No data about you or your boards is sent.

There is no telemetry. Fonts and icons ship with the app.

Report vulnerabilities privately as described in [SECURITY.md](https://github.com/Smacktur/drawhl/blob/main/SECURITY.md), not in a public issue.
