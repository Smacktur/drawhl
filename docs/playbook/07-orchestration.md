# 07. Orca: parallel agents

Orca (`orca` CLI) provides managed worktrees, terminals and **supervised orchestration**: a coordinator (Claude) hands out tasks to workers (Claude / Codex), waits for `worker_done` and answers questions.

The `orca-cli` and `orchestration` skills are installed globally. The current guide comes from the binary: `orca skills get orchestration`.

## When to use what

| Situation | Tool |
|---|---|
| One sequential task / slice | Regular Claude session, no orchestration |
| ≥ 3 independent `[P]` tasks, contract fixed | `orchestration` (coordinator + workers) |
| Hand a task to a separate worktree without supervision | `orca-cli` handoff |
| Check the UI in a browser | `orca` browser or `/gstack-qa` |

## Preconditions

1. **Contract and skeleton exist.** Until `contracts/` exists, a single agent works.
2. **All rules are committed.** A worktree contains only committed files: without a commit of `AGENTS.md`/`docs/`, the worker runs without the rules.
3. **One zone, one worker.** Zones do not overlap:

| Stream | Zone |
|---|---|
| Backend domain + api | `backend/app/{domain,api}/`, `backend/tests/` |
| Adapters / data / evals | `backend/app/adapters/`, `data/`, `evals/` |
| Frontend | `frontend/` |
| Docs / review | `README.md`, `docs/` |

No more than **3 workers**: beyond that you cannot keep up with checking results.

## Coordinator loop

```text
orca status --json
orca orchestration run-create --objective "<wave goal>" --json
# create the branch and worktree ourselves: name by our rules, not by the Orca prefix
git worktree add -b feat/<area>-a ~/orca/workspaces/<repo>/feat-<area>-a main
orca orchestration worker-start --spec "<task>" --worktree path:$HOME/orca/workspaces/<repo>/feat-<area>-a --agent claude --model sonnet --effort medium --json
orca orchestration check --wait --types "worker_done,escalation,question" --timeout-ms 900000 --json
# for each message: reply to a question / verify the result yourself → worker-release → check --ack <id> --wait ...
```

`--worktree new-child|new-top-level` generates a branch named `<github-login>/<name>`, and there is no `--branch` flag. So the coordinator creates the branch with `git worktree add -b`, and Orca receives the ready worktree through the `path:` selector. Cleanup: `orca worktree rm --worktree path:<path> --force` (removes the branch too).

## Model and effort: always explicit

Without `--model`, the worker takes the provider's most powerful model and burns through the limit fast. Pick the level by the cognitive complexity of the task (the shared model-per-phase table is in `08-models.md`):

| Level | Tasks | Claude | Codex |
|---|---|---|---|
| **L** | boilerplate, seed data, docs, simple tests for existing code | `sonnet` / `low` (mechanical work: `haiku` / `low`) | light model / `low` |
| **M** (default) | feature from a ready spec, endpoint, adapter, UI component | `sonnet` / `medium` | standard / `medium` |
| **H** | architecture, contract, unclear bug, integration, review of a critical diff | `opus` / `high` | top model / `high` |

- Coordinator: default Claude model, effort `medium`.
- Unsure: M. Stuck on M: retry the same task at level H (`--retry-of`).
- The reviewer runs on a different provider than the code author.
- Codex slugs: `codex debug models`.
- The actual model comes from the status line of the worker terminal (`worker-read --source terminal`), not from `launch.effective` and not from the model's self-report.

## Task spec template

```text
Target: backend/app/adapters/llm/ (only)
Change: implement <X> for the Assistant port from specs/001-*/contracts/.
Constraints: follow docs/playbook/04-coding-standards.md; do not change domain/ or contracts/.
Ownership: may edit backend/app/adapters/llm/** and backend/tests/test_llm_*.py. Nothing else.
Observable acceptance: `cd backend && uv run pytest -q` green; commit on your branch with a conventional message.
Report: plain text in worker_done summary, no backticks.
```

## Coordinator prompt

```text
Be an Orca coordinator (orchestration skill). Take the [P] tasks from specs/<feature>/tasks.md
for the current slice. Start up to 3 workers in separate worktrees using the spec template
from docs/playbook/07-orchestration.md, each with its own zone. Pass --model and --effort
to each by level L/M/H. Create the branch and worktree yourself via git worktree add -b feat/<area>-<short>,
and pass --worktree path:<path> to the worker. Verify results yourself (test/run), not by the summary.
After success, merge the branch into main and run make check. Report on each task.
```

## Pitfalls

- Workers in the same worktree touch the same files → conflict.
- The contract changes mid-wave → stop the wave, update `contracts/`, redistribute.
- `check --wait` returned empty: that is a checkpoint, not an error; after 3 empty results, run `worker-list`.
- Codex summaries can be broken: backticks in `worker_done` are executed by the shell. Verify the result yourself.
- `worker-release` → `retained`, `reason: user_takeover`: you typed in the worker terminal; clean up with `orca worktree rm`.
- On startup Codex may show a promo window for a new model: Enter from the Orca prompt selects it and rewrites `~/.codex/config.toml`. Run `codex` by hand once and close the windows.
- Worker hung without `worker_done` → `worker-read --source terminal`; if it is stuck on a menu: `worker-stop`, `worker-release`, restart.
