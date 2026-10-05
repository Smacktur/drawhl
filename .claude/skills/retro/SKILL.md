---
name: retro
description: Run a project retrospective and record it in the launchpad experience library — what worked, what did not, what helped, lessons turned into actions (KEDB entries, tool verdicts, methodology changes). Use when the user says /retro, at the end of the pipeline (after G4), when a project is paused or killed, or mid-project after a painful stretch.
---

# Project retrospective → library

Library: `$(launch home)/library` (format: its `README.md`). Project slug: `project_name` in `.copier-answers.yml`.

## 1. Gather facts (do not ask what you can read)

- `.launch/state.json` — phase, gates, slices done.
- `docs/research.md` (G0 verdict, top hypotheses), `docs/brief.md` (Must / Should / Won't), `docs/decisions.md`.
- `git log --oneline --reverse` and `git log --format='%ad %s' --date=short` — timeline, how long each slice took, reverts and fix streaks.
- `specs/*/tasks.md` — planned vs done.
- Existing `library/projects/<slug>.md`, if any.

## 2. Ask the user — one message, up to 5 questions

Only what the facts cannot tell:
- Did the MVP test the hypothesis? What was the signal (users, numbers, feedback)?
- What worked better than expected?
- What was painful or wasted time?
- Which tool, skill or rule helped most, and which got in the way?
- Status now: shipped / paused / killed / abandoned — and why?

## 3. Write

Update or create `library/projects/<slug>.md` per the README's project template: idea, research verdict, stack, path/repo, timeline, **retro** (worked / did not / helped / hindered / lessons → actions). Set `status` and `date`.

Turn every lesson into an action, one of:
- **KEDB entry** for a non-obvious error (use the `/lib-add` format), linked as `[[slug]]`;
- **tool/skill verdict change** with evidence (e.g. `trial` → `adopt` after it worked on a real project, → `hold` with the reason);
- **methodology proposal** — a concrete change to `template/docs/playbook/*`, `AGENTS.md.jinja` or a skill, written as a checklist item in the retro. **Do not edit launchpad methodology from here**; the user applies it (or `/lib-insights` picks it up).

## 4. Index and commit in launchpad

```bash
launch lib index
git -C "$(launch home)" add library && git -C "$(launch home)" commit -m "docs(library): retro <slug>"
```

Do not push unless the user asks. Report: status, top 3 lessons, actions created.
