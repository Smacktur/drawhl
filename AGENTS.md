# AGENTS.md — правила для AI-агентов (Claude Code, Codex)

**drawhl** — Open-source infinite canvas with live Jira Data Center task cards for leads who think spatially
Профиль: **oss** ([стратегия](docs/playbook/01-strategy.md)). Ресерч: [docs/research.md](docs/research.md). Идея и scope: [docs/brief.md](docs/brief.md). Полный свод: [docs/playbook/](docs/playbook/README.md).

## Жёсткие правила

1. **Main всегда запускается.** Незавершённое — в ветках `feat/<slice>`. Перед мержем — `make check`.
2. **Один срез за раз, end-to-end** (UI → API → domain). Не горизонтальные слои.
3. **Гейт = стоп.** На гейтах G1–G4 (см. стратегию) остановись и жди решения человека.
4. **Запуск одной командой** `docker compose up --build` на чистой машине по README.
5. **Без ключей тоже работает.** Всё внешнее — за портом с mock-реализацией. Секреты — только в ENV.
6. **Стороннее раскрываем** в `THIRD_PARTY.md` (библиотеки, модели, датасеты).
7. Никаких `git push --force`, `reset --hard`, удаления веток/тегов без явной просьбы человека.
8. **Репозиторий станет публичным вместе со всей историей.** Никаких токенов, внутренних URL, имён коллег, данных и скриншотов рабочих систем в коммитах, тестах и фикстурах — только выдуманные данные.
9. **Лицензии.** Новая зависимость — совместима с MIT (`make licenses`), без проприетарных SDK с ключом. Пользовательское изменение — строка в `CHANGELOG.md` (`Unreleased`).
10. **Публичные тексты на английском**: README, CONTRIBUTING, CHANGELOG, шаблоны issue и PR, тексты UI.

## Принципы

- **Думай до кода.** Проговаривай допущения. Не ясно — спроси, не угадывай.
- **Простота.** Минимум кода под задачу. Никаких фич и абстракций «на будущее». Won't из brief — не делаем.
- **Точечные изменения.** Правь только нужное, в стиле окружающего кода.
- **Цель с проверкой.** У каждой задачи — проверяемый критерий (тест, curl, скрин). Докажи результат выводом.
- **Contract-first.** Контракт API (`specs/*/contracts/`) меняется только осознанно и с уведомлением.
- **Оставайся в своей зоне** при параллельной работе.
## UI

Перед UI-работой — [DESIGN.md](DESIGN.md) (нет файла — создать по [10-design.md](docs/playbook/10-design.md)). Компоненты — shadcn из `frontend/src/components/ui/`, цвета — токены темы. Новый экран — `/hallmark`, доводка — `/impeccable`, проверка среза — `/ui-review`.

## Стандарты кода

Полностью: [docs/playbook/04-coding-standards.md](docs/playbook/04-coding-standards.md). Коротко:

- Код, идентификаторы, комментарии, логи, коммиты — **на английском**.
- Комментарий объясняет *почему*, а не *что*. Обычно одна строка. Docstring — только у публичного API, одной строкой.
- Никакого закомментированного кода и декоративных баннеров.
- Формат и линт — инструментом (`make fmt`), не руками.

## Архитектура

Подробно: [docs/playbook/03-architecture.md](docs/playbook/03-architecture.md).

```text
backend/app/api/       HTTP: роуты, схемы, маппинг ошибок
backend/app/domain/    бизнес-логика, порты, доменные ошибки — тесты здесь
backend/app/adapters/  реализации портов (включая mock)
backend/app/config.py  ENV, одна точка
frontend/src/          React/TS: api/ (zod), components/ui/ (shadcn), lib/, index.css (тема)
```

Зависимости: `api → domain ← adapters`. Domain не импортирует FastAPI и SDK провайдеров.

## Команды

| Команда | Что делает |
|---|---|
| `make check` | lint + тесты — гейт перед мержем |
| `make up` / `make down` | поднять / остановить compose |
| `make smoke` | core scenario против поднятого стека |
| `make dev-api` / `make dev-web` | локально с hot reload |
| `make fmt` | автоформат |

## Пайплайн

Фаза — в `.launch/state.json`. Продолжение работы — скилл `/pipeline` (Claude) или вручную по таблице в [docs/playbook/README.md](docs/playbook/README.md). Спеки — spec-kit в `specs/`, принципы — `.specify/memory/constitution.md`.

## Опыт

Библиотека опыта — `library/` в launchpad (путь: `launch home`). Перед выбором инструмента или при странной ошибке — поиск там (`rg -il '<ключ>' "$(launch home)/library"`). Новые грабли и находки — `/lib-add`, итоги проекта — `/retro`.

## Definition of Done для задачи

- [ ] Критерий готовности выполнен и показан (вывод теста / curl / скрин)
- [ ] `make check` зелёный
- [ ] Main запускается
- [ ] Новые ENV — в `.env.example` и README
- [ ] Новые зависимости — в `THIRD_PARTY.md`
- [ ] Коммит с conventional-сообщением
