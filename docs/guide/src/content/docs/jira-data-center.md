---
title: Connect Jira Data Center
---

drawhl supports Jira Data Center and Server 8.14 and later. It uses your own personal access token, so a Jira admin doesn't need to set anything up.

1. Create a `.env` file next to the compose file with a key that encrypts your token on disk:

   ```bash
   echo "DRAWHL_SECRET_KEY=$(openssl rand -base64 32)" >> .env
   ```

2. Restart: `docker compose up -d` (add `-f compose.release.yml` if you run from images).
3. In Jira, open your profile → Personal Access Tokens → Create token.
4. In drawhl, open Settings → Task source (main menu or `⌘,`), choose the Jira provider, enter the base URL (`https://jira.example.com`) and the token, then press "Test connection". It shows your Jira name.

Keep `DRAWHL_SECRET_KEY` safe. If you change or lose it, enter the token again.

Jira Data Center is usually reachable only from the corporate network, so the host running drawhl must be able to reach it too. For a corporate certificate authority, see `JIRA_CA_BUNDLE` in [Configuration](../configuration/).

## Other trackers

Jira Cloud, Linear, Plane, Todoist, TickTick and Windshift are planned. drawhl talks to trackers through one provider interface, so a new provider is a good first contribution: see [CONTRIBUTING.md](https://github.com/Smacktur/drawhl/blob/main/CONTRIBUTING.md).
