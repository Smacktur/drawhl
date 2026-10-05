# 09. Деплой: dev → stage → prod

Три среды, один конфиг. Провайдер облака — **Render**: постоянный free tier для веб-сервисов и инфраструктура как код в `render.yaml`.

| Среда | Где | Кто создаёт | Стоимость |
|---|---|---|---|
| **dev** | ноутбук | `make up` / `make dev-*` | 0 |
| **stage** | Render, окружение `stage` | `render.yaml` + автодеплой из `main` | 0 (free) |
| **prod** | Render, окружение `production` | тот же `render.yaml`, полуручной запуск | платно |

## dev

`make up` сам запускает Docker Desktop / OrbStack, если демон не отвечает (`scripts/ensure-docker.sh`), и поднимает compose. Без Docker — `make dev-api` + `make dev-web`.

## stage

### Как устроено

- `api` — Docker-сервис из `backend/Dockerfile`, план `free`. Засыпает через 15 минут без трафика, просыпается до минуты.
- `web` — static site из `frontend/`: бесплатный, не засыпает, раздаётся с CDN. Запросы `/api/*` уходят rewrite-правилом на публичный URL `api`, поэтому браузер видит один origin и CORS не нужен. Nginx-контейнер на Render не используем: бесплатные сервисы не принимают трафик из private network.
- Деплой — на каждый push в `main`, **только после зелёного CI** (`autoDeployTrigger: checksPass`). Сервис пересобирается, только если менялась его папка (`rootDir`), и Render судит по **последнему коммиту пуша**: если он трогает только `.launch/state.json` или доки, деплоя не будет, даже если коммиты ниже меняли код. Поэтому state среза коммитится в merge-коммите. Пропустил — `render deploys create <service-id> --commit <sha>`.
- Секреты (`sync: false` в `render.yaml`) берутся из локального `.env` (он в `.gitignore`): `make stage-env` заливает в Render изменившиеся и передеплоивает эти сервисы. Руками в дашборд за ENV не ходим. Обычные значения (`value:`) Render подтягивает сам автосинком Blueprint при push в `main`. Новый секрет: ключ с `sync: false` в `render.yaml` + значение в `.env` → `make stage-env`.

### Ограничения free tier

- **Диск эфемерный.** SQLite в `data/` обнуляется при каждом деплое и засыпании. Для stage это нормально. Нужны данные между деплоями — внешний Postgres (Neon free без срока; Render free Postgres удаляется через 30 дней).
- Холодный старт `api` до минуты — первый запрос после паузы медленный.
- Лимиты на build-минуты и трафик в месяц. Без привязанной карты при превышении сервисы приостанавливаются, а не списывают деньги.

### Первый запуск (один раз на проект)

Ручные шаги — человек, остальное — агент.

1. Репозиторий на GitHub уже создан `launch new` (иначе `launch publish`).
2. **Человек:** аккаунт Render, *New → Blueprint*. Первый раз — *Configure account* у GitHub и дать Render доступ к репозиторию (или ко всем). Затем выбрать репозиторий. Render прочитает `render.yaml` и создаст проект, окружение `stage` и оба сервиса. Создать Blueprint можно только из дашборда: ни CLI, ни MCP этого не умеют. Поля секретов при создании можно оставить пустыми.
3. **Человек:** если имя сервиса занято, Render добавит к поддомену суффикс. Тогда поправить URL в `render.yaml` (rewrite) и `STAGE_*_URL` в `Makefile`.
4. **Агент:** `make stage-env` — секреты из `.env` в Render; затем `make stage-smoke` — будит `api` и прогоняет smoke против stage.

### Дальше

Push в `main` → CI → деплой. Проверка — `make stage-smoke`. Логи и статус деплоев — Render CLI (`render services`, `render logs`) или Render MCP.

Доступ агента к Render: API-ключ в переменной окружения `RENDER_API_KEY` (Account Settings → API Keys). Ключ хранится в менеджере паролей / профиле шелла, **не в репозитории и не в чате**. CLI: `brew install render`.

## prod

Полуручной формат: решения с деньгами и доменом принимает человек.

1. **Человек:** stage проверен, G4 пройден, легал-документы опубликованы (`/legal`).
2. **Агент:** в `render.yaml` добавить окружение `production` — копия `stage` с суффиксом `-prod` в именах, `plan: starter` (или выше) для `api`, `domains:` со своим доменом, `permissions: protection: enabled`. У web-сервиса — `SITE_URL=https://<домен>` и `ALLOW_INDEXING=true`: без них prod закрыт от поисковиков (`11-seo.md`). Данные SQLite должны переживать деплой — `disk: {name: data, mountPath: /app/data, sizeGB: 1}` у `api` (диск только на платных планах; с диском нет zero-downtime деплоя) или внешний Postgres в `databases:`. PR, ревью, мерж.
3. **Человек:** купить домен, привязать карту в Render, в дашборде синхронизировать Blueprint (секреты `sync: false` — там же), прописать DNS-записи, которые покажет Render (TLS выпускается сам).
4. **Агент:** `make stage-smoke STAGE_API_URL=<URL prod api> STAGE_WEB_URL=https://<домен>`, затем `make audit URL=https://<домен>` (если есть UI).

В `production` ставим `autoDeployTrigger: off`: деплой только по явной команде человека, `render deploys create <service-id> --commit <sha тега>`.
