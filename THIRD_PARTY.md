# Third-party components & AI usage

## Open-source библиотеки

| Компонент | Лицензия | Зачем |
|---|---|---|
| FastAPI | MIT | HTTP API |
| Pydantic / pydantic-settings | MIT | Валидация, конфиг из ENV |
| uvicorn | BSD-3 | ASGI-сервер |
| prometheus-client | Apache-2.0 | Метрики |
| React | MIT | UI |
| Vite | MIT | Сборка |
| Tailwind CSS | MIT | Стили |
| shadcn/ui, cn | MIT | Компоненты, тема, слияние классов |
| Radix UI | MIT | Доступные примитивы под shadcn |
| lucide-react | ISC | Иконки |
| Geist (@fontsource-variable/geist) | OFL-1.1 | Шрифт |
| class-variance-authority, tw-animate-css | Apache-2.0 / MIT | Варианты компонентов, анимации |
| TanStack Query | MIT | Серверное состояние |
| zod | MIT | Валидация ответов API |
| marked | MIT | Markdown → HTML для легал-страниц при сборке |
| pip-licenses | MIT | Проверка лицензий Python-зависимостей (`make licenses`) |
| license-checker-rseidelsohn | BSD-3-Clause | Проверка лицензий npm-зависимостей (`make licenses`) |

Полный список с версиями — в lock-файлах (`backend/uv.lock`, `frontend/package-lock.json`).

## Модели и внешние API

| Модель / API | Провайдер | Как используется |
|---|---|---|

## Данные

| Датасет | Источник | Лицензия | Примечание |
|---|---|---|---|

## Шаблоны

- Скелет проекта и методология — [launchpad](https://github.com/Smacktur/launchpad).

## AI-инструменты разработки

| Инструмент | Для чего |
|---|---|
| Claude Code | Генерация кода, отладка, документация |
| OpenAI Codex | Параллельная разработка, кросс-ревью |
| GitHub spec-kit | Спецификация, план, задачи (`specs/`) |
| gstack | Ревью scope/архитектуры, QA, security |
| context7 MCP | Актуальная документация библиотек |
| marketingskills (MIT, Corey Haines) | Маркетинговые скиллы для `/grow`: контекст продукта, кастдев, тексты, блогеры, рефералки, сообщества, каталоги (`.claude/skills/`) |
| Hallmark (MIT), Impeccable (Apache-2.0) | Дизайн-скиллы: генерация и критика UI (`.claude/skills/`) |
| Playwright MCP, Chrome DevTools MCP, shadcn MCP | Проверка UI в браузере, компоненты |
