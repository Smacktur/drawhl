# 02. Стек

Правило №1: **стек, который ты быстрее всех отлаживаешь сам.** Код пишет AI, но чинить и отвечать за решения — тебе.
Правило №2: **скучные технологии.** Новая библиотека — только если экономит > 30 минут или это стандарт де-факто.

## Базовый стек launchpad

| Слой | Выбор | Почему |
|---|---|---|
| Backend | Python 3.12+, **FastAPI**, Pydantic v2, uvicorn | Быстро, типы на границах, OpenAPI из коробки |
| Пакеты | **uv** (lock-файл) | Быстрая воспроизводимая установка |
| Качество | ruff (lint + format), pytest | Один инструмент на роль |
| Метрики / логи | prometheus-client, JSON-логи (stdlib) | Production-feel без инфраструктуры |
| Frontend (если есть UI) | **Vite + React + TypeScript**, Tailwind v4, **shadcn/ui** (radix, lucide), TanStack Query, zod | Лучше всего генерится агентами; shadcn — готовые доступные компоненты и тема на CSS-переменных |
| Frontend качество | oxlint, prettier, vitest + Testing Library | Быстрые, почти без конфигурации |
| Запуск | Docker Compose, Makefile | Одна команда на чистой машине |
| Хранилище | SQLite через stdlib `sqlite3` → Postgres при необходимости | Без ORM, пока схема мелкая |

### Когда что добавлять (backend)

| Нужно | Берём |
|---|---|
| БД | stdlib `sqlite3` + `schema.sql` (`CREATE TABLE IF NOT EXISTS`), файл `DB_PATH=data/app.db`, `:memory:` в тестах. Одно соединение (`check_same_thread=False`) + `threading.Lock`, WAL. Переходы состояния — compare-and-set (`UPDATE … WHERE step = ?`, проверять `rowcount`). SQLAlchemy + Alembic — когда таблиц > ~10 или нужен Postgres |
| Векторный поиск / RAG | Postgres + pgvector |
| LLM | При `--llm` есть порт уровня задачи (`Assistant`) с rule-based mock и транспорт `OpenAICompatLLM` (OpenAI, OpenRouter, vLLM, Ollama). Новая задача для LLM — новый метод или порт в `domain/ports.py`, принимающий и возвращающий доменные типы; промпт и парсинг ответа — в адаптере, mock детерминированно собирает ответ из входа. Anthropic — отдельный транспорт по той же схеме |
| Фоновые задачи | `BackgroundTasks` FastAPI; очередь — только если задачи > 30 с или нужна надёжность |
| ML / данные | pandas / polars, scikit-learn |
| HTTP к внешним API | httpx с таймаутом, за портом в `adapters/` |

### Frontend

- Компоненты — **shadcn/ui**: базовый набор уже в `src/components/ui/` (button, input, label, textarea, card, badge, alert, skeleton, separator). Нужен ещё — `npx shadcn@latest add <name>`; найти — `npx shadcn@latest search <query>`, документация — `npx shadcn@latest docs <name>`. Файлы в `components/ui/` — код проекта, их можно править, но prettier их не трогает, чтобы `add --diff` показывал только наши изменения.
- `cn` — пакет [`cn`](https://github.com/shadcn-ui/cn) от shadcn (замена clsx + tailwind-merge), реэкспорт в `@/lib/utils`.
- Тема — CSS-переменные в `src/index.css` (`:root` и `.dark`), шрифт — `@fontsource-variable/geist`, иконки — `lucide-react`. Цвета в компонентах — только токены (`bg-primary`, `text-muted-foreground`), не `text-gray-500`.
- Анимации — `motion`, когда нужны.
- Серверное состояние — TanStack Query, не ручные `useEffect`.
- Ответы API валидируются zod (`src/api/client.ts`).
- Типы клиента можно генерировать из OpenAPI (`openapi-typescript`), когда эндпоинтов больше пяти.

## Вне базового стека

Если идея требует другого (мобильное приложение, чистый Go-сервис, Next.js fullstack, CLI) — **явно фиксируем это в `docs/decisions.md`** и адаптируем скелет. Launchpad пока генерирует только FastAPI (+ React).

## LLM-провайдеры

- Провайдер и модель — **только через ENV** (`LLM_PROVIDER`, `LLM_MODEL`, `LLM_BASE_URL`).
- `LLM_PROVIDER=mock` — дефолт: детерминированные ответы, работает без ключей.
- Structured output (JSON-схема) везде, где ответ парсит код.
- ПДн маскируются в domain до отправки (`mask_pii`).

## Версии

Версии фиксирует lock-файл (`uv.lock`, `package-lock.json`). Перед использованием API библиотеки — актуальная документация через **context7**, не по памяти.
