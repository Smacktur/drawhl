# Playbook — drawhl

Свод правил работы над проектом: что делать, в каком порядке, каким инструментом. Приходит из [launchpad](https://github.com/Smacktur/launchpad) и обновляется командой `launch update`, поэтому **правки методологии вносим в launchpad, а не здесь**.

Профиль: **oss**. Агенты (Claude Code, Codex) читают это через `AGENTS.md` / `CLAUDE.md`.

## Карта документов

| # | Документ | Когда открывать |
|---|---|---|
| 01 | [Стратегия (oss)](01-strategy.md) | Всегда. Scope, срезы, гейты, DoD |
| 02 | [Стек](02-stack.md) | Выбор технологий и новых зависимостей |
| 03 | [Архитектура](03-architecture.md) | Структура кода, порты, production-feel |
| 04 | [Coding standards](04-coding-standards.md) | Всегда при написании и ревью кода |
| 05 | [Инструменты](05-tooling.md) | Какой скилл / инструмент на каком шаге |
| 06 | [Качество и README](06-quality.md) | Перед мержем и перед релизом |
| 07 | [Orca: параллельные агенты](07-orchestration.md) | Если задач `[P]` ≥ 3 |
| 08 | [Модели по фазам](08-models.md) | Какая модель и effort на какой фазе |
| 09 | [Деплой](09-deploy.md) | dev → stage (Render free) → prod |
| 10 | [Дизайн UI](10-design.md) | Перед первой UI-задачей и при ревью UI |
| 11 | [SEO, AI-поиск, аналитика](11-seo.md) | Публичные страницы, перед stage и prod, `make audit` |
| — | [`DESIGN.md`](../../DESIGN.md) | Визуальное направление проекта |
| 12 | [Продвижение](12-growth.md) | После ship: стратегия каналов, материалы, метрики, кастдев |
| — | [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md) | Принципы для spec-kit |
| — | [`docs/research.md`](../research.md) | Конкуренты, спрос, боли, инсайды, гипотезы |
| — | [`docs/brief.md`](../brief.md) | Идея, гипотеза, scope |

## Пайплайн

Состояние — в `.launch/state.json`, ведёт скилл `/pipeline`.

| # | Фаза | Где | Результат | Гейт |
|---|---|---|---|---|
| 0 | Intake | launchpad `/launch` | уточнённая идея | — |
| 1 | Research | launchpad `/launch` | `docs/research.md`: go / pivot / kill | **G0** |
| 2 | Scope | launchpad `/launch` | `docs/brief.md` | **G1** |
| 3 | Stack | launchpad `/launch` | выбор frontend / llm | — |
| 4 | Scaffold | `launch new` | этот репозиторий, `make check` зелёный | — |
| 5 | Spec | `/pipeline` → spec-kit | `specs/NNN-*/{spec,plan,tasks}.md`, `contracts/` | **G2** |
| 6 | Build | `/pipeline` | срезы из `tasks.md`, по одному | **G3** на срез |
| 7 | Verify | `/pipeline` | ревью, QA, безопасность | — |
| 7b | Legal | `/pipeline` → `/legal` | Privacy Policy, Terms, согласие РФ/КЗ; регионы US, EU, RU, KZ; `docs/legal/README.md` | стоп |
| 8 | Ship | `/pipeline` | README, чистый клон, stage на Render, тег `v0.1.0`, `/retro` | **G4** |
| 9 | Grow | `/grow` | `docs/growth/`: стратегия, материалы, журнал экспериментов | **G5** каналы, **G6** материалы |

## Золотые правила

1. **Main всегда запускается.** Сломал — чинишь или откатываешь.
2. **Один срез за раз, end-to-end.** Не горизонтальные слои.
3. **Гейт = стоп.** Агент ждёт решения человека.
4. **Без ключей тоже работает.** Mock-режим для всего внешнего.
5. **Scope режем, качество минимума — нет.**
6. **Один инструмент на одну роль.** Спеки — только spec-kit.
7. **Опыт — в библиотеку.** Грабли, находки и ретро — в `library/` launchpad (`/retro`, `/lib-add`).
