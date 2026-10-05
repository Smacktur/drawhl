# 03. Архитектура

Цель: чистый, модульный код **без оверинжиниринга**. Архитектура экономит время (mock-режим, параллельная работа), а не съедает его.

## Принципы

1. **Думай до кода.** Проговаривай допущения. Не ясно — спроси, не угадывай.
2. **Простота.** Минимум кода под задачу. Без спекулятивных фич и абстракций «на будущее».
3. **Точечные изменения.** Правь только нужное, в стиле окружающего кода.
4. **Цель с проверкой.** Каждая задача = проверяемый критерий (тест, curl, скрин).
5. **Contract-first.** Сначала контракт API (`specs/*/contracts/`), потом реализация.
6. **Порты и адаптеры (облегчённо).** Внешний мир (LLM, БД, внешние API) — за интерфейсом.
7. **12-factor конфиг.** Всё через ENV, дефолты безопасные, секреты не в git.

## Структура

```text
.
├── AGENTS.md / CLAUDE.md      # правила для агентов
├── README.md                  # как запустить и проверить
├── THIRD_PARTY.md             # сторонние компоненты и AI
├── Makefile                   # up / test / lint / check / smoke
├── docker-compose.yml
├── .env.example
├── .launch/state.json         # фаза пайплайна
├── specs/                     # spec-kit: spec, plan, tasks, contracts
├── docs/
│   ├── brief.md               # идея, гипотеза, scope
│   ├── architecture.md        # диаграммы
│   ├── decisions.md           # лог решений (ADR-lite)
│   └── playbook/              # методология (из launchpad)
├── backend/
│   ├── app/
│   │   ├── main.py            # wiring: config → adapters → api; /health /ready /metrics
│   │   ├── config.py          # ENV, одна точка
│   │   ├── observability.py   # JSON-логи, request-id, метрики
│   │   ├── api/               # роуты, схемы запросов/ответов, маппинг ошибок
│   │   ├── domain/            # бизнес-логика, порты (Protocol), доменные ошибки
│   │   └── adapters/          # реализации портов: llm/, storage/, внешние API
│   └── tests/                 # domain — юнит, api — через TestClient
├── frontend/                  # Vite + React (если есть UI)
│   └── src/{api,components,lib}
├── data/                      # маленькие seed-данные
└── scripts/
```

**Зависимости: `api → domain ← adapters`.** `domain` не импортирует FastAPI, httpx, SDK провайдеров. `main.py` — единственное место, где всё собирается.

## Как добавить фичу (рецепт среза)

1. **Domain:** чистая функция / класс в `domain/<feature>.py` + тесты в `tests/test_<feature>.py`. Ошибки — наследники `DomainError`.
2. **Порт** (если нужен внешний мир): `Protocol` в `domain/ports.py` на уровне задачи (доменные типы на входе и выходе, не «строка в строку»), реализация + mock в `adapters/<kind>/`. Mock детерминированный и правдоподобный: сценарий должен проходить на нём целиком.
3. **API:** роут в `api/routes.py` (или `api/<feature>.py` + `include_router`), Pydantic-схемы входа/выхода. Логики в роуте нет — только вызов domain.
4. **Wiring:** адаптер создаётся в `create_app()` и кладётся в `app.state`; в роут попадает через `Depends`.
5. **UI:** функция в `src/api/client.ts` с zod-схемой, компонент с состояниями loading / error / empty.
6. **Проверка:** `make check`, затем `make up && make smoke` (добавить шаги сценария в `scripts/smoke.py`).
7. **Браузер** (если есть UI), до ревью: `/ui-review` — сценарий среза в настоящем браузере (Playwright MCP), console errors, скриншоты desktop / mobile, светлая / тёмная тема, Web Interface Guidelines, критика против `DESIGN.md` ([10-design.md](10-design.md)). Юнит-тесты и ревью пропускают гонки и потерю ввода.

## Production-feel (уже в скелете)

| Что | Как |
|---|---|
| Health | `GET /health` (liveness), `GET /ready` (зависимости доступны — добавляй проверки) |
| Метрики | `GET /metrics`: `http_requests_total`, `http_request_duration_seconds` по шаблону роута |
| Логи | JSON в stdout, `request_id` из `x-request-id` или сгенерированный, возвращается в ответе |
| Ошибки | `{"error": {"code", "message"}}`, без стектрейсов наружу; `DomainError` → 4xx/503 |
| Устойчивость | Таймауты на внешние вызовы; сбой провайдера → `DependencyUnavailable` → 503 |
| Приватность | `mask_pii` перед отправкой текста в LLM (при `--llm`) |

Добавляй по мере надобности: rate limit на тяжёлые эндпоинты, ретраи с backoff, кеш.

## Тесты

- Юнит — на `domain/` (быстро, без моков или с mock-адаптерами).
- API — через `TestClient` с `create_app(Settings(...))`.
- Smoke — `make smoke`: `scripts/smoke.py` (stdlib) внутри контейнера api против поднятого compose; `make stage-smoke` — тот же скрипт против stage.
- Evals — если есть LLM/ML: 10–30 кейсов в `evals/`, метрика + латентность.

## Лог решений

`docs/decisions.md` — строка на решение: `дата — решение — почему — альтернативы`.
