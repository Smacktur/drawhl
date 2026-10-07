---
title: Data, backups and upgrades
category:
  uri: Self-hosting
position: 2
---

All data is one SQLite file in `./data`, which survives rebuilds and upgrades.

## Back up and restore

- **Back up:** copy `data/app.db` while the stack is stopped. From a source checkout, `make backup` copies it to `data/backups/` with a timestamp and keeps the newest 20; `make up` runs it before every rebuild.
- **Restore:** stop the stack and copy a backup over `data/app.db`.

## Upgrade

From images:

```bash
docker compose -f compose.release.yml pull
docker compose -f compose.release.yml up -d
```

Pin a version with `TAG`, for example `TAG=2026.10.6`. Release notes are on [GitHub Releases](https://github.com/Smacktur/drawhl/releases).

From source:

```bash
git pull
docker compose up --build -d
```
