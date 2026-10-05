# 06. Quality and README

## Before every merge into main (G3)

- [ ] `make check` is green (lint + tests)
- [ ] The slice scenario is shown: curl / test output or a screenshot
- [ ] There is a UI → `/ui-review` passed, table attached (recommendation: taste does not block, a broken scenario and console errors do)
- [ ] `make up && make smoke`: if the API, compose or Dockerfile changed
- [ ] New ENV variables are in `.env.example` and the README table
- [ ] New dependencies are in `THIRD_PARTY.md`
- [ ] Diff review: `/gstack-review` (for large slices, `/gstack-codex`)

## README: required sections

| Section | How to cover it |
|---|---|
| What it is | One line + problem → solution → for whom |
| Quick start | **One command**: `docker compose up --build` |
| Architecture | Mermaid + a link to `docs/architecture.md` |
| Technologies | Table: layer → technology → why |
| Environment variables | Table: variable → purpose → default |
| Core scenario check | Step by step: open URL → do X → see Y. Plus curl and `make smoke` |
| Development | `make dev-api`, `make dev-web`, `make check` |
| Limitations and next | What was deliberately not done (Won't from the brief) |

## Clean clone check (G4)

```bash
make clean-clone     # clones origin/main into a temp folder and brings it up per the README
```

Plus a separate agent: "Clone the repo into an empty folder and follow the README **literally**, assuming nothing. Report every place where you stumbled." Everything it stumbled on gets fixed in the README.

- [ ] Works without `.env` and keys (mock mode)
- [ ] Ports are stated
- [ ] Seed data loads by itself
- [ ] No absolute paths or dependence on the developer's machine
- [ ] From clone to a working scenario in ≤ 5 minutes

## Evals (if there is LLM / ML)

- 10–30 cases in `evals/cases.*`, generated ones are marked.
- Quality metric, latency p50/p95, cost per request, provider/model.
- The table goes in the README. Numbers over words.

## Final MVP checklist

- [ ] All Must slices are merged, main is green
- [ ] `make check`, `make smoke`, `make clean-clone` pass
- [ ] README has the sections above, limitations are recorded
- [ ] `THIRD_PARTY.md` is complete
- [ ] `docs/architecture.md` is up to date
- [ ] No secrets (`gitleaks detect`)
- [ ] Tag `v0.1.0`
