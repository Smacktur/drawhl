# 08. Models by phase

Choose the model by the **cognitive complexity of the phase**, not by the importance of the project. Expensive models go where thinking is needed; cheap ones where searching and executing are needed.

## Table

| Phase | Who runs it | Model / effort | Why |
|---|---|---|---|
| Intake, scope, gates, research synthesis | main session | **Opus 5.5** (default) | Dialogue, judgment, decisions |
| Research: 3 search streams | `researcher` subagent | **Sonnet / medium** | Search and extraction, lots of web tokens |
| Spec: specify, tasks | main session | Opus 5.5 | Wording and slicing |
| **Architecture**: slices, contract, data, decisions | `architect` subagent | **Fable / high** | The project's key decisions, expensive to get wrong |
| Build | main session | Opus 5.5 | Code from a ready plan |
| Build, parallel | Orca workers | L: Sonnet / low · M: Sonnet / medium · H: Opus / high | See `07-orchestration.md` |
| Code review (G3, Verify) | `reviewer` subagent + `/gstack-codex` | **Opus / high** + second provider | Catch bugs, not style |
| QA, routine, docs | main session or L worker | Sonnet | Mechanical work |
| `/lib-add` | skill frontmatter | Sonnet / low | Single turn, simple entry |
| `/retro`, `/lib-insights` | main session | Opus 5.5 | Conclusions from experience |

## How it works

- **The main session** uses the default model (Opus 5.5). A skill cannot switch it for long; it changes only manually via `/model`.
- **Subagents** (`.claude/agents/*.md`) have the model and effort fixed in frontmatter, and these always apply, regardless of the session. That is why phases with a special model are moved into subagents: `researcher`, `architect`, `reviewer`.
- **`model:` in skill frontmatter** applies only to the single turn where the skill is invoked. It suits one-shot skills (`/lib-add`), not multi-turn ones with gates.
- **Orca workers**: pass `--model` / `--effort` explicitly on every `worker-start`.

## Rules

- The architect **does not write files**: it hands over decisions, and the main session produces `plan.md` and the contracts. The expensive model is spent on thinking, not on formatting.
- Fable only in `architect`. `xhigh` / `max` only by explicit human decision for genuinely non-trivial architecture.
- The reviewer runs on a different model or provider than the code author, when possible.
- To change a phase's model, edit the agent frontmatter **in launchpad** and run `launch update`, not in the project.
