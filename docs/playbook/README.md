# Playbook: drawhl

The set of rules for working on the project: what to do, in what order, with which tool. It comes from [launchpad](https://github.com/Smacktur/launchpad) and is updated by the `launch update` command, so **make methodology changes in launchpad, not here**.

Profile: **oss**. Agents (Claude Code, Codex) read this through `AGENTS.md` / `CLAUDE.md`.

## Document map

| # | Document | When to open |
|---|---|---|
| 01 | [Strategy (oss)](01-strategy.md) | Always. Scope, slices, gates, DoD |
| 02 | [Stack](02-stack.md) | Choosing technologies and new dependencies |
| 03 | [Architecture](03-architecture.md) | Code structure, ports, production feel |
| 04 | [Coding standards](04-coding-standards.md) | Always when writing and reviewing code |
| 05 | [Tooling](05-tooling.md) | Which skill / tool for which step |
| 06 | [Quality and README](06-quality.md) | Before merging and before a release |
| 07 | [Orca: parallel agents](07-orchestration.md) | If there are ≥ 3 `[P]` tasks |
| 08 | [Models by phase](08-models.md) | Which model and effort for which phase |
| 09 | [Deploy](09-deploy.md) | dev → stage (Render free) → prod |
| 10 | [UI design](10-design.md) | Before the first UI task and when reviewing UI |
| 11 | [SEO, AI search, analytics](11-seo.md) | Public pages, before stage and prod, `make audit` |
| - | [`DESIGN.md`](../../DESIGN.md) | The project's visual direction |
| 12 | [Growth](12-growth.md) | After ship: channel strategy, materials, metrics, customer development |
| - | [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md) | Principles for spec-kit |
| - | [`docs/research.md`](../research.md) | Competitors, demand, pains, insights, hypotheses |
| - | [`docs/brief.md`](../brief.md) | Idea, hypothesis, scope |

## Pipeline

State lives in `.launch/state.json`, maintained by the `/pipeline` skill.

| # | Phase | Where | Result | Gate |
|---|---|---|---|---|
| 0 | Intake | launchpad `/launch` | refined idea | - |
| 1 | Research | launchpad `/launch` | `docs/research.md`: go / pivot / kill | **G0** |
| 2 | Scope | launchpad `/launch` | `docs/brief.md` | **G1** |
| 3 | Stack | launchpad `/launch` | frontend / llm choice | - |
| 4 | Scaffold | `launch new` | this repository, `make check` green | - |
| 5 | Spec | `/pipeline` → spec-kit | `specs/NNN-*/{spec,plan,tasks}.md`, `contracts/` | **G2** |
| 6 | Build | `/pipeline` | slices from `tasks.md`, one at a time | **G3** per slice |
| 7 | Verify | `/pipeline` | review, QA, security | - |
| 7b | Legal | `/pipeline` → `/legal` | Privacy Policy, Terms, RU/KZ consent; US, EU, RU, KZ regions; `docs/legal/README.md` | stop |
| 8 | Ship | `/pipeline` | README, clean clone, stage on Render, tag `v0.1.0`, `/retro` | **G4** |
| 9 | Grow | `/grow` | `docs/growth/`: strategy, materials, experiment log | **G5** channels, **G6** materials |

## Golden rules

1. **Main always runs.** If you break it, fix it or roll back.
2. **One slice at a time, end-to-end.** No horizontal layers.
3. **Gate = stop.** The agent waits for a human decision.
4. **Works without keys too.** Mock mode for everything external.
5. **Cut scope, not the minimum quality.**
6. **One tool per role.** Specs only in spec-kit.
7. **Experience goes to the library.** Pitfalls, findings and retros go to launchpad's `library/` (`/retro`, `/lib-add`).
