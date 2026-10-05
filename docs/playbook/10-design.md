# 10. UI design

Without explicit direction an agent draws the statistical average: Inter/Geist, a purple gradient, a hero and three cards. Three things fix this: a **target** (`DESIGN.md`), **taste skills** (Hallmark, Impeccable) and **a look at the result** (browser, screenshots, `/ui-review`).

## Source of truth

| What | Where | Who reads it |
|---|---|---|
| Direction, palette, typography, tone | `DESIGN.md` in the root | agents, Hallmark, Impeccable |
| Theme in code | `frontend/src/index.css`: shadcn CSS variables in `:root` and `.dark` | components via tokens (`bg-primary`) |
| Components | `frontend/src/components/ui/` (shadcn) | all UI |

`DESIGN.md` and `index.css` must not diverge: change the palette in one, change it in the other.

## DESIGN.md format

```markdown
# Design: <project>

## Direction
One phrase + 3 adjectives (for example: "a calm work tool: dense, warm, no decoration").
Anti-references: what it must not look like.

## References
1–3 sites: URL → what we take (grid, typography, rhythm, tone). We do not take assets or copy.

## Color
Background, text, primary, accent, destructive, border: values in oklch and the shadcn token name. Light and dark theme.

## Typography
Fonts (headings / text / mono), size scale, weights, line height.

## Shape and rhythm
Radius (`--radius`), spacing step, density, shadows (yes / no and where).

## Components
shadcn preset, deviations from standard components, icons (lucide, stroke width).

## Motion
Where animation exists, duration, `prefers-reduced-motion`.

## Copy
Interface tone, language, how we write buttons and errors.

## Don'ts
Project-specific bans beyond the general ones (see "AI-slop signs" below).
```

## How to get DESIGN.md

1. **At `/launch`** (Scope phase): a draft from the answers about audience, tone and references; it enters the project through `launch new --design`.
2. **No file** → before the first UI task: create one using the format above in one of these ways:
   - there is a reference site → tokens with `npx dembrandt <url> --dtcg` and/or `/hallmark study <url>`;
   - you like the style of a known product → a starter file from [awesome-design-md](https://github.com/VoltAgent/awesome-design-md);
   - nothing at all → `/hallmark` proposes a theme, or a quick start with a preset: `npx shadcn@latest apply <nova|vega|maia|lyra|mira|luma|sera|rhea>`.
3. Move colors, radius and font into `frontend/src/index.css`; for the font use the `@fontsource-variable/<font>` package instead of Geist.

**Project updated from launchpad < v0.6.0** (screens on raw classes, `components/ui/` unused): migrating to tokens and shadcn is a separate task after `DESIGN.md`, not something done in passing within a slice. Start with `/hallmark audit`: it gives a redesign plan.

**You may** take tokens and techniques (palette direction, scale, hierarchy, patterns). **You may not** take logos, illustrations, copy, brand icon sets, or make a recognizable copy of another brand.

## Tools by role

| Role | Tool |
|---|---|
| New screen or page from scratch, style from a reference | `/hallmark` (modes `study <url>`, `redesign`) |
| Critique and polish of finished UI | `/impeccable` (`critique`, `audit`, `polish`, `bolder`, `quieter`, `distill`, `harden`) |
| Check a slice before review | `/ui-review` (recommendation, does not block G3) |
| Components | `npx shadcn@latest add / search / docs`, shadcn MCP |
| The agent's eyes | Playwright MCP (scenario, screenshots), Chrome DevTools MCP (console, network, performance) in `.mcp.json` |
| Tokens of someone else's site | `npx dembrandt <url> --dtcg` |

Hallmark and Impeccable live in `.claude/skills/` (copies from launchpad, updated with `launch update`). On first run Impeccable downloads its engine to `~/.impeccable/bin/`; without network it works from the instructions in the skill itself.

## Slice UI gate (recommendation)

Before reviewing a slice with UI, run `/ui-review`:

- [ ] the slice scenario passes in the browser, no console errors
- [ ] screenshots: desktop 1280 and mobile 390, light and dark theme
- [ ] Web Interface Guidelines: focus is visible, hit target ≥ 24px (44px on mobile), input ≥ 16px on mobile, keyboard, submit on Enter
- [ ] loading / error / empty look like part of the product
- [ ] `/impeccable critique` against `DESIGN.md`: no deviations from the direction

## AI-slop signs

Purple-indigo gradients · one font for everything with no hierarchy · hero + three feature cards · emoji instead of icons · glassmorphism and shadows "for beauty" · everything centered · identical spacing with no rhythm · raw palette colors (`gray-500`) instead of tokens · decorative animation on every element.
