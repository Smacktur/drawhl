---
name: pipeline
description: Continue the launchpad delivery pipeline for this project (spec → build → verify → legal → ship → grow) from the phase recorded in .launch/state.json. Use when the user says /pipeline, "continue", "next phase", or asks what to do next in a launchpad-generated project.
---

# Launchpad pipeline

Drive this project from its current phase to the next gate. Methodology: `docs/playbook/` (strategy in `01-strategy.md`). Idea and scope: `docs/brief.md`.

## Start

1. Read `.launch/state.json`, `docs/research.md`, `docs/brief.md`, `docs/playbook/01-strategy.md`. If research was skipped (placeholder text), say so once and offer to run discovery (`docs/discovery.md` in `launch home`) before the spec.
2. Tell the user in 2–3 lines: current phase, what this step produces, which gate ends it.
3. If `docs/brief.md` still has TODO in Hypothesis or Core scenario, stop: scope is not done. Help fill it (phase 1) and ask for G1 approval before anything else.

After every phase or gate, update `.launch/state.json` (`phase`, `gates`, `slices_done`, `feature`) and commit it together with the phase output.

## Phase: spec (ends with G2)

1. `/speckit-specify` with the core scenario, users and success signal from the brief. Won't items go to out-of-scope.
2. **Architecture via the `architect` subagent** (Fable / high, see `docs/playbook/08-models.md`): pass the spec path; it returns slices, API contract, data model, ports, decisions, risks, parallelism. Do not redo its thinking — review it for conflicts with the brief.
3. `/speckit-plan` with the architect's output, stack from `docs/playbook/02-stack.md`, structure from `03-architecture.md` and the existing skeleton (FastAPI app in `backend/app`, UI in `frontend/` if present). The plan must reuse the skeleton, not re-scaffold. Append the architect's decisions to `docs/decisions.md`.
4. `/speckit-tasks`. Tasks must be grouped into **vertical slices that follow the core scenario steps**; the first slice is the shortest path to user value. Mark `[P]` only for tasks with disjoint file ownership. Setup holds only what the first slice needs; config, dependencies and stubs for later slices go into those slices.
5. If spec.md contains `[NEEDS CLARIFICATION]`, run `/speckit-clarify` first.
6. Suggest `/gstack-plan-eng-review` if the plan introduces new infrastructure (DB, queue, external API).
7. **G2 — stop.** Show: which model the `architect` subagent ran on, slices list, API contract summary, anything added beyond the brief. Wait for approval. On approval: `phase: "build"`, `feature: "<specs dir>"`.

## Phase: build (G3 after each slice)

For the next slice not in `slices_done`:

1. `git switch -c feat/<slice>` from up-to-date `main`.
2. Implement tasks in order, following the slice recipe in `03-architecture.md` (domain + tests → port/adapter with mock → API → UI → smoke). Look up library APIs via context7. First UI task and no `DESIGN.md` → create it and apply it to `frontend/src/index.css` first (`docs/playbook/10-design.md`).
3. Parallelize with Orca (`07-orchestration.md`) only if the slice has ≥ 3 `[P]` tasks with disjoint zones; otherwise do it in this session.
4. Extend `scripts/smoke.py` with the slice's scenario.
5. Prove it: `make check` output, then `make up && make smoke` output. UI present → `/ui-review` (step 7 of the recipe): scenario in a real browser, screenshots, guidelines, critique against `DESIGN.md`. Recommended, not blocking; attach its table.
6. Review via the `reviewer` subagent (Opus / high) on `git diff main...HEAD`; fix blockers and majors.
7. **G3 — stop.** Show the proof, the diff summary and the review verdict. On approval: `git merge --no-ff --no-commit`, append the slice to `slices_done` in `.launch/state.json`, commit both as the merge commit, push. A separate state-only commit on top would make Render skip the deploy (see `09-deploy.md`).
8. When all Must slices are done: `phase: "verify"`. Should item — only if the user asks.

## Phase: verify

1. `reviewer` subagent on the full diff since scaffold, plus `/gstack-codex` for a second-provider opinion (timebox 10 min).
2. UI present → `/gstack-qa` on the core scenario.
3. Personal data, money or public exposure → `/gstack-cso`.
4. Fix findings that break the core scenario or security; list the rest as limitations.
5. `phase: "legal"`.

## Phase: legal

Profile `oss` (`.copier-answers.yml`): run `/legal` in its OSS mode — license audit and the README Privacy section; Privacy Policy and Terms only for a hosted demo. Then `gates.legal: "drafted"`, `phase: "ship"`.

1. Run `/legal`: Privacy Policy and Terms of Service from the project's real data flows with regional sections (US, EU, RU, KZ) and the Russian consent document, published at `/legal/*` (UI) or in `docs/legal/` (API only), record in `docs/legal/README.md`.
2. It stops twice: before drafting, for decisions outside the text (RU/KZ localization, RKN filings, cookie consent); at the end, to confirm the drafts and decide on a lawyer review. Then `gates.legal: "drafted"` (or `"reviewed"`), `phase: "ship"`.

## Phase: ship (ends with G4)

1. README: fill every TODO per `06-quality.md` (problem, solution, core scenario steps, limitations from Won't). Update `docs/architecture.md`, `THIRD_PARTY.md`.
2. `make check`, `make up && make smoke`.
3. Push `main`, then `make clean-clone`. No remote (project made with `--no-publish`) → ask the user before running `launch publish`.
4. Stage per `docs/playbook/09-deploy.md`: if the Render Blueprint is connected, `make stage-smoke`. If not, list the manual first-run steps for the user and wait; if they skip stage, record it as a limitation.
5. UI present and stage is up → `make audit` (`docs/playbook/11-seo.md`): no ❌ in the crawler checks; PageSpeed numbers go into the G4 evidence. No `PSI_API_KEY` → run the crawler part only (`python3 scripts/audit.py <url> --no-psi`) and note it.
6. Profile `oss` — before G4, in addition:
   - README, `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md` without TODO; README in English with a screenshot of the core scenario;
   - `make licenses`;
   - full history scan: `gitleaks git --no-banner --redact`; also `git log -p | rg -i '<internal domains, names>'` for what gitleaks cannot know. Any finding → stop: rewriting history needs the user's explicit decision;
   - stage is optional (public demo only).
7. **G4 — stop.** Show the DoD checklist from `01-strategy.md` with evidence. On approval: `git tag v0.1.0`; push tags only if the user confirms.
8. Profile `oss`, after G4 and only with the user's explicit yes (publishing is irreversible: forks and caches keep the code):
   ```bash
   gh repo edit --visibility public --accept-visibility-change-consequences
   gh api -X PUT repos/{owner}/{repo}/private-vulnerability-reporting
   gh repo edit --add-topic <topic> --enable-discussions   # topics from the brief
   ```
   Move `Unreleased` in `CHANGELOG.md` under `0.1.0`, commit, push `main` and the tag: the release workflow publishes images to GHCR and the GitHub Release. Then make the GHCR packages public (GitHub → Packages → Package settings) and check `docker compose -f compose.release.yml up -d` on a clean machine.
9. Run `/retro` to record what worked and what did not in the launchpad library. `phase: "done"`.

## After done: grow

The product is live; next is users. Offer `/grow` (`docs/playbook/12-growth.md`): context, readiness, strategy (G5), kits (G6), measure loop. It keeps its own progress under `growth` in `.launch/state.json`; code it needs (ref links, vanity pages, events) comes back here as slices.

## Rules

- Models per phase: `docs/playbook/08-models.md`. Main session stays on the default model; phase-specific models come from subagents (`researcher`, `architect`, `reviewer`) — call them, don't imitate them.

- Gates are hard stops: ask, then wait. Do not batch two gates in one turn.
- Never build items from Won't. If the user asks for one, note it in `docs/decisions.md` and update the brief.
- Methodology issues found along the way (a wrong rule, a missing step) — note them for the user to fix upstream in launchpad; don't edit `docs/playbook/` here.
- A non-obvious error that cost > 15 minutes → offer `/lib-add` to record it in the launchpad KEDB right away, not only at the retro.
