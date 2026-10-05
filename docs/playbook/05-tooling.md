# 05. Tooling

Rule: **one tool per role.** Hundreds of skills eat context and conflict.

## Phase → tool

| Phase | Tool | Why |
|---|---|---|
| Intake (idea is vague) | gstack `/gstack-office-hours` | Reformulate the problem |
| Scope (G1) | gstack `/gstack-plan-ceo-review` | Value and boundaries through a business lens |
| Spec | **spec-kit**: `/speckit-specify` → `/speckit-plan` → `/speckit-tasks` | Spec, contract, slices with `[P]` |
| Architecture (G2) | gstack `/gstack-plan-eng-review`, `codebase-design` | For non-trivial decisions |
| Library documentation | **context7** MCP | Current APIs, fewer hallucinations |
| Build | Claude Code; Orca with ≥ 3 `[P]` (`07-orchestration.md`) | Code |
| Review | gstack `/gstack-review`, `/gstack-codex` (second provider) | Diff quality |
| UI design (if there is a UI) | `/hallmark` (new screens, style from a reference), `/impeccable` (critique, polish), shadcn CLI / MCP | Per `DESIGN.md`, see `10-design.md` |
| UI slice verification | `/ui-review`: Playwright MCP, Chrome DevTools MCP (`.mcp.json`) | Screenshots, console, guidelines, taste |
| Browser QA | gstack `/gstack-qa` | UI scenario through the user's eyes |
| Security | gstack `/gstack-cso`, gitleaks | If there is PII, money, external access |
| Legal (before ship) | `/legal` | Privacy Policy and Terms for the project's real data: base + US, EU, RU, KZ regions, checklist of actions outside the text |
| SEO and speed (if there is a UI) | `make audit`, Chrome DevTools MCP | PageSpeed + what bots see without JS, see `11-seo.md` |
| Debugging | `diagnosing-bugs`, `/gstack-investigate` | Reproduce → hypothesis → fix |
| README / launch | `/gstack-plan-devex-review`, `make clean-clone` | Runs from scratch per the README |
| Promotion (after ship) | `/grow` + `/product-marketing`, `/customer-research`, `/copywriting`, `/influencer-marketing`, `/referrals`, `/community-marketing`, `/directory-submissions`, `/launch-strategy`, `/ai-seo` | Strategy for the project, materials, metrics; see `12-growth.md` |
| Experience | `/lib-add` (finding, error), `/retro` (project results) | launchpad library: KEDB, tool verdicts, retros |

## spec-kit: trimmed cycle

| Step | Command | Result |
|---|---|---|
| 0 | constitution | ✅ already in `.specify/memory/constitution.md` |
| 1 | `/speckit-specify <core scenario from brief.md>` | `spec.md` |
| 2 | `/speckit-plan <stack from 02 + structure from 03>` | `plan.md`, `contracts/`, `data-model.md`, `quickstart.md` |
| 3 | `/speckit-tasks` | `tasks.md`: slices, `[P]` for parallel |
| 4 | implementation by slices (`/pipeline`) | code |
| opt. | `/speckit-clarify` | if spec.md contains `[NEEDS CLARIFICATION]` |
| opt. | `/speckit-analyze` | spec ↔ plan ↔ tasks cross-check before G2 on large features |

## Git

- Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`.
- Small commits, one logical change per commit.
- No `push --force` to main and no `reset --hard` without an explicit request.
- `.env` in `.gitignore`; hooks are installed by `launch new` (manually: `pre-commit install`): gitleaks + ruff on commit, `make check` on push.

## Installing the tools

Check: `launch doctor` (in launchpad). Install commands are in the launchpad README.
