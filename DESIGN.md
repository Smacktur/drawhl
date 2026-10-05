# Design: drawhl

## Direction
A quiet working canvas where only the tasks stand out: dense, precise, calm. The canvas is neutral; color is carried by card statuses and frames.
Anti-references: heavy, colorful Miro with panels everywhere, the "toy-like" hand-drawn Excalidraw, marketing SaaS with gradients.

## References
- Linear (linear.app) → density, thin borders, a calm gray scale, small type that doesn't shout.
- tldraw (tldraw.com) → minimal toolbar at the bottom center, full-screen canvas, dot grid.
- Jira and Confluence inline issue macro → card anatomy: type icon, blue key, title, uppercase status lozenge, struck-through key for a closed task.
- Miro → frames with the title above the border and free-form grouping.
Tokens and techniques only, no logos, icon sets or copied branding.

## Color
Light theme (default; Light, Dark or System from the main menu, stored in the browser):
- `--background` canvas `oklch(0.985 0.002 250)`, dot grid `oklch(0.90 0.004 250)`
- `--card` card `oklch(1 0 0)`, `--border` `oklch(0.91 0.005 250)`
- `--foreground` `oklch(0.24 0.01 260)`, `--muted-foreground` `oklch(0.52 0.012 260)`
- `--primary` (task key, selection, links) `oklch(0.53 0.17 255)`
- `--accent` (hover, selected frame background) `oklch(0.96 0.012 255)`
- `--destructive` `oklch(0.58 0.2 27)`
- Statuses, by Jira category: To Do `oklch(0.93 0.006 260)` on `oklch(0.42 0.01 260)`; In Progress `oklch(0.93 0.04 255)` on `oklch(0.45 0.13 255)`; Done `oklch(0.93 0.06 150)` on `oklch(0.42 0.11 150)`
- Sticky note and frame colors: 6 muted hues with the same lightness `L 0.94`, `C 0.05`

Dark theme:
- `--background` `oklch(0.18 0.006 260)`, grid `oklch(0.27 0.006 260)`
- `--card` `oklch(0.22 0.007 260)`, `--border` `oklch(0.30 0.008 260)`
- `--foreground` `oklch(0.93 0.004 260)`, `--muted-foreground` `oklch(0.68 0.01 260)`
- `--primary` `oklch(0.70 0.14 255)`, `--accent` `oklch(0.27 0.02 255)`
- Statuses: the same light fills as in the light theme, like Confluence lozenges

## Typography
- Text and UI: IBM Plex Sans (`@fontsource-variable/ibm-plex-sans`), 13px base on the canvas, 14px in panels.
- Task keys and monospace: JetBrains Mono (`@fontsource-variable/jetbrains-mono`), 12px, tabular.
- Scale: 11 (lozenge, uppercase, +0.04em), 12, 13, 14, 16, 20 (frame title). Weights 400, 500, 600. Line height 1.35 on the canvas, 1.5 in panels.

## Shape and rhythm
- `--radius` 6px, 3px for the lozenge.
- 4px step. Card: padding 4×8, width fits the content up to 320px, collapsed height 24px.
- Shadows: only on the mini-card (popover) and the floating toolbar, one soft shadow. Cards on the canvas are flat with a 1px border.

## Components
- Default shadcn preset with the tokens above. The mini-card popover is built on `Popover`, settings on `Sheet`.
- Toolbar: floating, bottom center, 18px icons. Tools: select, hand, frame, sticky note, text, Jira card. Arrows are dragged from node handles, not picked as a tool. Each tool button's tooltip shows its shortcut; the full list opens with `?`. The Jira card tool opens a `Popover` above the toolbar with the key-or-link input; no input stays on the canvas.
- Top bar: floating, top left, one row like tldraw's page bar: main menu button (`DropdownMenu`: Settings, Theme → Light, Dark, System) and the board name with a chevron (`DropdownMenu`: boards, "New board"). Same surface and shadow as the toolbar.
- Context menu: shadcn `ContextMenu` on right click. Empty spot: "Add Jira card", then the other element tools. Selection: "Delete". Items start with a verb.
- No canvas library attribution label (`proOptions.hideAttribution`).
- Icons: lucide, stroke 1.75.
- Jira card: one inline flow like the Confluence issue macro: type icon, key (link to Jira), title, status lozenge. Long titles wrap from the left edge and are cut at 120 characters so the lozenge stays visible. States: collapsed (icon, key, lozenge), inline (with title), expanded (popover: assignee, priority, updated, "Open in Jira" link). Closed task: key struck through, title muted.
- Sync indicator in the corner: "synced 12s ago"; on error, a red dot and the reason text.

## Motion
- Card expand and collapse 120ms ease-out, popover 100ms fade-scale.
- Status change: the lozenge softly highlights once (400ms).
- Pan and zoom with no inertia effects beyond the xyflow defaults.
- `prefers-reduced-motion`: all animations except pan are disabled.

## Copy
English, short and to the point, no exclamation marks. Buttons start with a verb: "Add card", "Refresh all", "Connect Jira". Errors name the cause and the action: "Jira returned 401. Check your token in Settings."

## Don'ts
- Handwritten fonts and "sketchy" lines.
- A colored canvas and colored panels: color only on statuses, sticky notes and frames.
- Side panels open by default. The canvas takes the whole screen.
- Shadows on cards on the canvas.
- The Jira logo and Atlassian icon sets in the bundle. The task type icon is the `iconUrl` from the user's Jira response (their own instance), with a neutral lucide icon as a fallback.
