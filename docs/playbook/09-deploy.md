# 09. Deploy: dev → stage → prod

Three environments, one config. The cloud provider is **Render**: a permanent free tier for web services and infrastructure as code in `render.yaml`.

| Environment | Where | Who creates it | Cost |
|---|---|---|---|
| **dev** | laptop | `make up` / `make dev-*` | 0 |
| **stage** | Render, `stage` environment | `render.yaml` + autodeploy from `main` | 0 (free) |
| **prod** | Render, `production` environment | the same `render.yaml`, semi-manual launch | paid |

## dev

`make up` starts Docker Desktop / OrbStack by itself if the daemon does not respond (`scripts/ensure-docker.sh`), and brings up compose. Without Docker: `make dev-api` + `make dev-web`.

## stage

### How it works

- `api`: a Docker service from `backend/Dockerfile`, plan `free`. It sleeps after 15 minutes without traffic and takes up to a minute to wake.
- `web`: a static site from `frontend/`: free, never sleeps, served from a CDN. Requests to `/api/*` go through a rewrite rule to the public URL of `api`, so the browser sees a single origin and CORS is not needed. We do not use an Nginx container on Render: free services do not accept traffic from the private network.
- Deploy happens on every push to `main`, **only after green CI** (`autoDeployTrigger: checksPass`). A service is rebuilt only if its folder changed (`rootDir`), and Render judges by the **last commit of the push**: if it touches only `.launch/state.json` or docs, there is no deploy, even if earlier commits changed code. That is why the slice state is committed in the merge commit. If you missed it: `render deploys create <service-id> --commit <sha>`.
- Secrets (`sync: false` in `render.yaml`) come from the local `.env` (it is in `.gitignore`): `make stage-env` uploads the changed ones to Render and redeploys those services. We do not go to the dashboard by hand for ENV. Regular values (`value:`) are picked up by Render itself through Blueprint autosync on push to `main`. New secret: a key with `sync: false` in `render.yaml` + a value in `.env` → `make stage-env`.

### Free tier limits

- **Ephemeral disk.** SQLite in `data/` is wiped on every deploy and sleep. Fine for stage. If you need data across deploys, use an external Postgres (Neon free has no time limit; Render free Postgres is deleted after 30 days).
- `api` cold start takes up to a minute: the first request after a pause is slow.
- Monthly limits on build minutes and traffic. Without a linked card, services are suspended on overrun instead of charging money.

### First launch (once per project)

Manual steps are for the human, the rest for the agent.

1. The GitHub repository has already been created by `launch new` (otherwise `launch publish`).
2. **Human:** Render account, *New → Blueprint*. The first time, click *Configure account* at GitHub and give Render access to the repository (or to all). Then pick the repository. Render reads `render.yaml` and creates the project, the `stage` environment and both services. A Blueprint can only be created from the dashboard: neither the CLI nor MCP can do it. Secret fields can be left empty at creation.
3. **Human:** if the service name is taken, Render appends a suffix to the subdomain. Then fix the URL in `render.yaml` (rewrite) and `STAGE_*_URL` in `Makefile`.
4. **Agent:** `make stage-env` pushes secrets from `.env` to Render; then `make stage-smoke` wakes `api` and runs the smoke test against stage.

### Afterwards

Push to `main` → CI → deploy. Check with `make stage-smoke`. Logs and deploy status: Render CLI (`render services`, `render logs`) or Render MCP.

Agent access to Render: an API key in the `RENDER_API_KEY` environment variable (Account Settings → API Keys). Keep the key in a password manager or shell profile, **not in the repository and not in chat**. CLI: `brew install render`.

## prod

Semi-manual format: the human makes decisions involving money and the domain.

1. **Human:** stage is verified, G4 is passed, legal documents are published (`/legal`).
2. **Agent:** add a `production` environment to `render.yaml`: a copy of `stage` with a `-prod` suffix in names, `plan: starter` (or higher) for `api`, `domains:` with the own domain, `permissions: protection: enabled`. On the web service: `SITE_URL=https://<domain>` and `ALLOW_INDEXING=true`; without them prod is closed to search engines (`11-seo.md`). SQLite data must survive deploys: `disk: {name: data, mountPath: /app/data, sizeGB: 1}` on `api` (disks exist only on paid plans; with a disk there are no zero-downtime deploys) or an external Postgres in `databases:`. PR, review, merge.
3. **Human:** buy the domain, link a card in Render, sync the Blueprint in the dashboard (`sync: false` secrets go there too), add the DNS records Render shows (TLS is issued automatically).
4. **Agent:** `make stage-smoke STAGE_API_URL=<prod api URL> STAGE_WEB_URL=https://<domain>`, then `make audit URL=https://<domain>` (if there is a UI).

In `production` set `autoDeployTrigger: off`: deploy only on an explicit human command, `render deploys create <service-id> --commit <tag sha>`.
