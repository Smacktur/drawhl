---
title: Configuration
---

Everything works without a `.env` file. To override defaults, copy [`.env.example`](https://github.com/Smacktur/drawhl/blob/main/.env.example) to `.env` next to the compose file and edit it.

| Variable | Purpose | Default |
|---|---|---|
| `DRAWHL_PASSWORD` | Password of the first account, `admin`. When empty, one is generated on first start, printed once to the API log and saved to `data/password`. Not read once the account exists | generated |
| `DRAWHL_SECRET_KEY` | Encrypts tracker tokens at rest; needed only to connect a tracker (`openssl rand -base64 32`) | unset |
| `JIRA_TLS_VERIFY` | Verify Jira's TLS certificate; `false` skips the check | `true` |
| `JIRA_CA_BUNDLE` | Path inside the container to a CA bundle for a corporate certificate authority | unset |
| `LOG_LEVEL` | Log level | `info` |
| `DB_PATH` | SQLite file inside the container | `data/app.db` |
| `APP_ENV` | Environment name: `local`, `stage` or `production` | `local` |
| `UPDATE_CHECK` | Ask GitHub every 6 hours for the latest release to show "update available" in About; `false` turns it off | `true` |

To trust a corporate CA, put the bundle in `./data` (for example `data/corp-ca.pem`) and set `JIRA_CA_BUNDLE=data/corp-ca.pem`.

The refresh interval is set in Settings → Task source, not in the environment.
