# Architecture

## Сейчас

```mermaid
flowchart LR
  User --> UI[Web UI<br/>React, nginx :3000]
  UI -->|/api| API[API<br/>FastAPI :8000]
  API --> D[Domain]
```

Слои: `api → domain ← adapters`, wiring в `backend/app/main.py`. Подробно — [playbook/03-architecture.md](playbook/03-architecture.md).

## Если взлетит

TODO: что меняется при росте нагрузки (реплики API, Postgres, очередь, кеш) — показываем, а не строим.
