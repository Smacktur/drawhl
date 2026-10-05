---
name: ui-review
description: Visual check of a UI slice before code review — walk the scenario in a browser, screenshots at desktop and mobile in light and dark, console errors, Web Interface Guidelines, taste critique against DESIGN.md. Use at step 7 of the slice recipe, when the user says /ui-review, or before a demo.
---

# UI review

Recommended check, not a gate: report findings, fix the cheap ones, list the rest. Method and checklist: `docs/playbook/10-design.md`.

## Steps

1. **Context.** Read `DESIGN.md`. Missing → say so once and suggest creating it (playbook 10) before polishing; continue with the checks that don't need it. Changed UI: `git diff --name-only main...HEAD -- frontend/src`.
2. **Run the app.** `make up` (or `make dev-api` + `make dev-web`); UI on `http://localhost:3000`.
3. **Browser pass** with Playwright MCP (fallback: a `playwright-core` script with system Chrome, `library` entry `playwright-core-system-chrome`):
   - walk the slice's scenario by roles and labels, including loading, error and empty states;
   - screenshots at 1280×800 and 390×844, light and dark (`document.documentElement.classList.toggle('dark')`); save to `tmp/ui-review/` (gitignored);
   - collect console errors and failed requests (Chrome DevTools MCP for network and performance if something looks slow; also the fallback if Playwright MCP can't start a browser).
   - `page.clock.install()` also freezes `motion` animations (they stay at opacity 0) — use a fresh context for anything with transitions.
4. **Guidelines.** Fetch `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md` and check the changed files against it; findings as `file:line — rule`.
5. **Taste.** Run `/impeccable critique` on the changed screens against `DESIGN.md` (hallmark `audit` is the alternative). Look for the AI-slop tells listed in playbook 10.
6. **Fix and report.** Fix what takes ≤ 15 minutes and stays inside the slice. Report a table: check → result → evidence (screenshot path, `file:line`), then the unfixed findings. Don't block G3 on taste; broken scenario, console errors and unreadable contrast are bugs, not taste.
