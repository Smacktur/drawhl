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
| React Flow (@xyflow/react) | MIT | Infinite canvas, nodes and edges |
| IBM Plex Sans (@fontsource-variable/ibm-plex-sans) | OFL-1.1 | UI font |
| JetBrains Mono (@fontsource-variable/jetbrains-mono) | OFL-1.1 | Monospace font for task keys |
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
| context7 MCP | Up-to-date library docs |
| marketingskills (MIT, Corey Haines) | Marketing skills for `/grow`: product context, customer research, copy, creators, referrals, communities, directories (`.claude/skills/`) |
| Hallmark (MIT), Impeccable (Apache-2.0) | Design skills: UI generation and critique (`.claude/skills/`) |
| Playwright MCP, Chrome DevTools MCP, shadcn MCP | UI checks in the browser, components |
