# Architecture

## Now

```mermaid
flowchart LR
  User --> UI[Web UI<br/>React, nginx :3000]
  UI -->|/api| API[API<br/>FastAPI :8000]
  API --> D[Domain]
```

Layers: `api → domain ← adapters`, wiring in `backend/app/main.py`. Details: [playbook/03-architecture.md](playbook/03-architecture.md).

## If it takes off

TODO: what changes as load grows (API replicas, Postgres, queue, cache) — shown here, not built.
