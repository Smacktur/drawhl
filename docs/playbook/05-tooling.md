# 05. Инструменты

Правило: **один инструмент на одну роль.** Сотни скиллов съедают контекст и конфликтуют.

## Фаза → инструмент

| Фаза | Инструмент | Зачем |
|---|---|---|
| Intake (идея размыта) | gstack `/gstack-office-hours` | Переформулировать проблему |
| Scope (G1) | gstack `/gstack-plan-ceo-review` | Ценность и границы глазами бизнеса |
| Spec | **spec-kit**: `/speckit-specify` → `/speckit-plan` → `/speckit-tasks` | Спека, контракт, срезы с `[P]` |
| Архитектура (G2) | gstack `/gstack-plan-eng-review`, `codebase-design` | Для нетривиальных решений |
| Документация библиотек | **context7** MCP | Актуальные API, меньше галлюцинаций |
| Build | Claude Code; Orca при ≥ 3 `[P]` (`07-orchestration.md`) | Код |
| Ревью | gstack `/gstack-review`, `/gstack-codex` (второй провайдер) | Качество диффа |
| Дизайн UI (если есть UI) | `/hallmark` (новые экраны, стиль по референсу), `/impeccable` (критика, доводка), shadcn CLI / MCP | По `DESIGN.md`, см. `10-design.md` |
| Проверка UI среза | `/ui-review`: Playwright MCP, Chrome DevTools MCP (`.mcp.json`) | Скриншоты, консоль, guidelines, вкус |
| QA в браузере | gstack `/gstack-qa` | UI-сценарий глазами пользователя |
| Безопасность | gstack `/gstack-cso`, gitleaks | Если есть ПДн, деньги, внешний доступ |
| Легал (перед ship) | `/legal` | Privacy Policy и Terms под реальные данные проекта: база + регионы US, EU, RU, KZ, чек-лист действий вне текста |
| SEO и скорость (если есть UI) | `make audit`, Chrome DevTools MCP | PageSpeed + что видят боты без JS, см. `11-seo.md` |
| Отладка | `diagnosing-bugs`, `/gstack-investigate` | Воспроизвести → гипотеза → фикс |
| README / запуск | `/gstack-plan-devex-review`, `make clean-clone` | Запускается с нуля по README |
| Продвижение (после ship) | `/grow` + `/product-marketing`, `/customer-research`, `/copywriting`, `/influencer-marketing`, `/referrals`, `/community-marketing`, `/directory-submissions`, `/launch-strategy`, `/ai-seo` | Стратегия под проект, материалы, метрики; см. `12-growth.md` |
| Опыт | `/lib-add` (находка, ошибка), `/retro` (итоги проекта) | Библиотека launchpad: KEDB, вердикты инструментов, ретро |

## spec-kit: урезанный цикл

| Шаг | Команда | Результат |
|---|---|---|
| 0 | constitution | ✅ уже в `.specify/memory/constitution.md` |
| 1 | `/speckit-specify <core scenario из brief.md>` | `spec.md` |
| 2 | `/speckit-plan <стек из 02 + структура из 03>` | `plan.md`, `contracts/`, `data-model.md`, `quickstart.md` |
| 3 | `/speckit-tasks` | `tasks.md`: срезы, `[P]` для параллельного |
| 4 | реализация по срезам (`/pipeline`) | код |
| опц. | `/speckit-clarify` | если spec.md содержит `[NEEDS CLARIFICATION]` |
| опц. | `/speckit-analyze` | сверка spec ↔ plan ↔ tasks перед G2 на крупных фичах |

## Git

- Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`.
- Мелкие коммиты, одно логическое изменение на коммит.
- Никаких `push --force` в main и `reset --hard` без явной просьбы.
- `.env` в `.gitignore`; хуки ставит `launch new` (вручную — `pre-commit install`): на commit gitleaks + ruff, на push `make check`.

## Установка инструментов

Проверка: `launch doctor` (в launchpad). Команды установки — в README launchpad.
