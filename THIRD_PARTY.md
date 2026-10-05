# Third-party components & AI usage

## Open-source libraries

| Component | License | Purpose |
|---|---|---|
| FastAPI | MIT | HTTP API |
| Pydantic / pydantic-settings | MIT | Validation, config from ENV |
| uvicorn | BSD-3 | ASGI server |
| prometheus-client | Apache-2.0 | Metrics |
| React | MIT | UI |
| Vite | MIT | Build |
| Tailwind CSS | MIT | Styles |
| shadcn/ui, cn | MIT | Components, theme, class merging |
| Radix UI | MIT | Accessible primitives for shadcn |
| lucide-react | ISC | Icons |
| Geist (@fontsource-variable/geist) | OFL-1.1 | Font |
| class-variance-authority, tw-animate-css | Apache-2.0 / MIT | Component variants, animations |
| TanStack Query | MIT | Server state |
| zod | MIT | API response validation |
| marked | MIT | Markdown → HTML for legal pages at build time |
| pip-licenses | MIT | Python dependency license check (`make licenses`) |
| license-checker-rseidelsohn | BSD-3-Clause | npm dependency license check (`make licenses`) |

Full list with versions: lock files (`backend/uv.lock`, `frontend/package-lock.json`).

## Models and external APIs

| Model / API | Provider | How it is used |
|---|---|---|

## Data

| Dataset | Source | License | Note |
|---|---|---|---|

## Templates

- Project skeleton and methodology — [launchpad](https://github.com/Smacktur/launchpad).

## AI development tools

| Tool | Used for |
|---|---|
| Claude Code | Code generation, debugging, docs |
| OpenAI Codex | Parallel development, cross-review |
| GitHub spec-kit | Spec, plan, tasks (`specs/`) |
| gstack | Scope and architecture review, QA, security |
| context7 MCP | Актуальная документация библиотек |
| marketingskills (MIT, Corey Haines) | Маркетинговые скиллы для `/grow`: контекст продукта, кастдев, тексты, блогеры, рефералки, сообщества, каталоги (`.claude/skills/`) |
| Hallmark (MIT), Impeccable (Apache-2.0) | Дизайн-скиллы: генерация и критика UI (`.claude/skills/`) |
| Playwright MCP, Chrome DevTools MCP, shadcn MCP | Проверка UI в браузере, компоненты |
