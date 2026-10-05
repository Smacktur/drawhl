# 03. Architecture

Goal: clean, modular code **without overengineering**. Architecture saves time (mock mode, parallel work); it does not eat it.

## Principles

1. **Think before code.** State your assumptions. If something is unclear, ask, do not guess.
2. **Simplicity.** The minimum code for the task. No speculative features or "just in case" abstractions.
3. **Surgical changes.** Change only what is needed, in the style of the surrounding code.
4. **Goal with verification.** Every task has a verifiable criterion (test, curl, screenshot).
5. **Contract-first.** The API contract first (`specs/*/contracts/`), then the implementation.
6. **Ports and adapters (lightweight).** The outside world (LLM, DB, external APIs) sits behind an interface.
7. **12-factor config.** Everything through ENV, safe defaults, secrets not in git.

## Structure

```text
.
├── AGENTS.md / CLAUDE.md      # rules for agents
├── README.md                  # how to run and verify
├── THIRD_PARTY.md             # third-party components and AI
├── Makefile                   # up / test / lint / check / smoke
├── docker-compose.yml
├── .env.example
├── .launch/state.json         # pipeline phase
├── specs/                     # spec-kit: spec, plan, tasks, contracts
├── docs/
│   ├── brief.md               # idea, hypothesis, scope
│   ├── architecture.md        # diagrams
│   ├── decisions.md           # decision log (ADR-lite)
│   └── playbook/              # methodology (from launchpad)
├── backend/
│   ├── app/
│   │   ├── main.py            # wiring: config → adapters → api; /health /ready /metrics
│   │   ├── config.py          # ENV, single entry point
│   │   ├── observability.py   # JSON logs, request-id, metrics
│   │   ├── api/               # routes, request/response schemas, error mapping
│   │   ├── domain/            # business logic, ports (Protocol), domain errors
│   │   └── adapters/          # port implementations: llm/, storage/, external APIs
│   └── tests/                 # domain: unit, api: via TestClient
├── frontend/                  # Vite + React (if there is a UI)
│   └── src/{api,components,lib}
├── data/                      # small seed data
└── scripts/
```

**Dependencies: `api → domain ← adapters`.** `domain` does not import FastAPI, httpx or provider SDKs. `main.py` is the only place where everything is assembled.

## How to add a feature (slice recipe)

1. **Domain:** a pure function / class in `domain/<feature>.py` + tests in `tests/test_<feature>.py`. Errors inherit from `DomainError`.
2. **Port** (if the outside world is needed): a `Protocol` in `domain/ports.py` at task level (domain types in and out, not "string in, string out"), implementation + mock in `adapters/<kind>/`. The mock is deterministic and plausible: the scenario must pass on it end to end.
3. **API:** a route in `api/routes.py` (or `api/<feature>.py` + `include_router`), Pydantic input/output schemas. No logic in the route, only a call to domain.
4. **Wiring:** the adapter is created in `create_app()` and put in `app.state`; it reaches the route via `Depends`.
5. **UI:** a function in `src/api/client.ts` with a zod schema, a component with loading / error / empty states.
6. **Verification:** `make check`, then `make up && make smoke` (add the scenario steps to `scripts/smoke.py`).
7. **Browser** (if there is a UI), before review: `/ui-review`: the slice scenario in a real browser (Playwright MCP), console errors, desktop / mobile screenshots, light / dark theme, Web Interface Guidelines, critique against `DESIGN.md` ([10-design.md](10-design.md)). Unit tests and review miss races and lost input.

## Production feel (already in the skeleton)

| What | How |
|---|---|
| Health | `GET /health` (liveness), `GET /ready` (dependencies available: add checks) |
| Metrics | `GET /metrics`: `http_requests_total`, `http_request_duration_seconds` by route template |
| Logs | JSON to stdout, `request_id` from `x-request-id` or generated, returned in the response |
| Errors | `{"error": {"code", "message"}}`, no stack traces outside; `DomainError` → 4xx/503 |
| Resilience | Timeouts on external calls; provider failure → `DependencyUnavailable` → 503 |
| Privacy | `mask_pii` before sending text to the LLM (with `--llm`) |

Add as needed: rate limit on heavy endpoints, retries with backoff, cache.

## Tests

- Unit: on `domain/` (fast, no mocks or with mock adapters).
- API: via `TestClient` with `create_app(Settings(...))`.
- Smoke: `make smoke`: `scripts/smoke.py` (stdlib) inside the api container against a running compose; `make stage-smoke` runs the same script against stage.
- Evals: if there is LLM/ML: 10–30 cases in `evals/`, metric + latency.

## Decision log

`docs/decisions.md`: one line per decision: `date | decision | why | alternatives`.
