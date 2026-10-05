# 07. Orca: параллельные агенты

Orca (`orca` CLI) даёт управляемые worktree, терминалы и **supervised-оркестрацию**: координатор (Claude) раздаёт задачи воркерам (Claude / Codex), ждёт `worker_done`, отвечает на вопросы.

Скиллы `orca-cli` и `orchestration` ставятся глобально. Актуальный гайд — из бинарника: `orca skills get orchestration`.

## Когда что

| Ситуация | Инструмент |
|---|---|
| Одна последовательная задача / срез | Обычная сессия Claude, без оркестрации |
| ≥ 3 независимых задач `[P]`, контракт зафиксирован | `orchestration` (координатор + воркеры) |
| Отдать задачу в отдельный worktree без контроля | `orca-cli` handoff |
| Проверить UI в браузере | `orca` browser или `/gstack-qa` |

## Предусловия

1. **Контракт и скелет есть.** Пока нет `contracts/` — работает один агент.
2. **Все правила закоммичены.** Worktree = только закоммиченное: без коммита `AGENTS.md`/`docs/` воркер работает без правил.
3. **Одна зона — один воркер.** Зоны не пересекаются:

| Поток | Зона |
|---|---|
| Backend domain + api | `backend/app/{domain,api}/`, `backend/tests/` |
| Adapters / данные / evals | `backend/app/adapters/`, `data/`, `evals/` |
| Frontend | `frontend/` |
| Доки / ревью | `README.md`, `docs/` |

Не больше **3 воркеров** — дальше не успеваешь проверять результат.

## Цикл координатора

```text
orca status --json
orca orchestration run-create --objective "<цель волны>" --json
# ветку и worktree создаём сами — имя по нашим правилам, не по префиксу Orca
git worktree add -b feat/<area>-a ~/orca/workspaces/<repo>/feat-<area>-a main
orca orchestration worker-start --spec "<задача>" --worktree path:$HOME/orca/workspaces/<repo>/feat-<area>-a --agent claude --model sonnet --effort medium --json
orca orchestration check --wait --types "worker_done,escalation,question" --timeout-ms 900000 --json
# на каждое сообщение: reply на question / проверить результат сам → worker-release → check --ack <id> --wait ...
```

`--worktree new-child|new-top-level` генерит ветку `<github-login>/<name>`, флага `--branch` нет. Поэтому ветку создаёт координатор через `git worktree add -b`, а Orca получает готовый worktree селектором `path:`. Уборка — `orca worktree rm --worktree path:<path> --force` (удаляет и ветку).

## Модель и effort — всегда явно

Без `--model` воркер берёт самую мощную модель провайдера и быстро сжигает лимит. Уровень — по когнитивной сложности задачи (общая таблица моделей по фазам — `08-models.md`):

| Уровень | Задачи | Claude | Codex |
|---|---|---|---|
| **L** | boilerplate, seed-данные, доки, простые тесты по готовому коду | `sonnet` / `low` (механика — `haiku` / `low`) | лёгкая модель / `low` |
| **M** (дефолт) | фича по готовой спеке, эндпоинт, адаптер, UI-компонент | `sonnet` / `medium` | стандартная / `medium` |
| **H** | архитектура, контракт, неясный баг, интеграция, ревью критичного диффа | `opus` / `high` | топовая / `high` |

- Координатор — дефолтная модель Claude, effort `medium`.
- Не уверен — M. Застрял на M → повтор той же задачи уровнем H (`--retry-of`).
- Ревьюер — на другом провайдере, чем автор кода.
- Слаги Codex: `codex debug models`.
- Фактическая модель — по статус-строке терминала воркера (`worker-read --source terminal`), а не по `launch.effective` и не по самоотчёту модели.

## Шаблон спеки задачи

```text
Target: backend/app/adapters/llm/ (only)
Change: implement <X> for the Assistant port from specs/001-*/contracts/.
Constraints: follow docs/playbook/04-coding-standards.md; do not change domain/ or contracts/.
Ownership: may edit backend/app/adapters/llm/** and backend/tests/test_llm_*.py. Nothing else.
Observable acceptance: `cd backend && uv run pytest -q` green; commit on your branch with a conventional message.
Report: plain text in worker_done summary, no backticks.
```

## Промпт координатору

```text
Будь координатором Orca (скилл orchestration). Возьми задачи с [P] из specs/<feature>/tasks.md
для текущего среза. Запусти до 3 воркеров в отдельных worktree по шаблону спеки
из docs/playbook/07-orchestration.md, у каждого своя зона. Каждому передавай --model и --effort
по уровню L/M/H. Ветку и worktree создавай сам через git worktree add -b feat/<area>-<short>,
воркеру передавай --worktree path:<path>. Результат проверяй сам (тест/запуск), не по summary.
После успеха мержи ветку в main и запускай make check. Отчитайся по каждой задаче.
```

## Грабли

- Воркеры в одном worktree трогают одни файлы → конфликт.
- Контракт меняется посреди волны → остановить волну, обновить `contracts/`, разослать.
- `check --wait` вернул пусто — это чекпоинт, не ошибка; после 3 пустых — `worker-list`.
- Summary Codex может быть битым: backticks в `worker_done` исполняются шеллом. Результат проверяй сам.
- `worker-release` → `retained`, `reason: user_takeover` — ты печатал в терминале воркера; уборка через `orca worktree rm`.
- Codex при старте может показать промо-окно новой модели: Enter из промпта Orca выбирает её и переписывает `~/.codex/config.toml`. Один раз запусти `codex` руками и закрой окна.
- Воркер завис без `worker_done` → `worker-read --source terminal`; висит на меню — `worker-stop`, `worker-release`, перезапуск.
