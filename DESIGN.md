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
- Timers: `--timer` `oklch(0.82 0.16 75)` with `--timer-foreground` `oklch(0.3 0.07 60)`, the only saturated fill on the canvas, so waiting spots stand out; `--timer-fired` `oklch(0.66 0.19 30)` with near-white text; the same in both themes

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
- Toolbar: floating, bottom center, 18px icons. Tools: select, hand, frame, sticky note, text, timer, Jira card, modules. Arrows are dragged from node handles, not picked as a tool. Each tool button's tooltip shows its shortcut; the full list opens with `?`. The Jira card tool opens a `Popover` above the toolbar with one input for keys, links or a JQL query (a query is recognized by its operators). While typing JQL, a suggestion list sits in the popover under the input (Tab inserts, arrows move, Esc closes the list first, then the popover), and the hint line below shows the match count or Jira's error; no input stays on the canvas.
- Top bar: floating, top left, one row like tldraw's page bar: main menu button (`DropdownMenu`: Settings, Theme → Light, Dark, System) and the board name with a chevron (`DropdownMenu`: boards, "New board", "Rename board" (the name turns into a field in place), "Delete board…" (confirm `Dialog`, focus on Cancel)). Same surface and shadow as the toolbar.
- Smart guides: while one element is dragged, 1px `--primary` lines above all nodes. Alignment is a dashed line through the matching edges or centers; an equal gap is a solid segment with 6px end ticks in each gap that matches. While one element is resized, a size that matches others snaps and each element of that size gets a bar 8px off its top (width) or left side (height), drawn like the gap marker. Snap distance is 6 screen pixels at any zoom; Alt moves and resizes freely. Element toolbars (sticky colors, module controls) hide while dragging.
- Context menu: shadcn `ContextMenu` on right click. Empty spot: "Add Jira card", then the other element tools. Selection: "Collapse cards" or "Expand cards" when cards are selected, "Add timer" when one element is, then "Delete". Items start with a verb.
- Modules: the Modules tool opens a `Popover` gallery above the toolbar (icon in a muted square, name, one-line description); the right-click menu lists "Add <module>" for each. A module is a card-surface block with a 36px header (icon, title) that is its drag handle; double-click the title to rename it, an empty title shows the module name faded, like a frame; the body is interactive and never drags the block. Selected: `--primary` border and ring, resize handles, and the module's controls in a toolbar above it, like the sticky color picker. A module this version cannot read shows a dashed border and a one-line note, never an error.
- Gantt: label column 160px by default, 120–480px by dragging its right border (`col-resize`, `--primary` on hover); two 24px header rows (quarters over weeks or months, months over days, years over quarters) in 12px text, labels hidden in cells narrower than 40px; grid lines in `--border`, weekends shaded `--muted`; today is a 1px `--primary` line below the header; round "+" buttons on both timeline edges while selected add a quarter. Controls: Days, Weeks, Months, Quarters, Dates (start and end in a popover).
- Gantt rows: 32px, label column with a grip, type icon, key and title (done: key struck through, muted); remove on hover. Bars are 20px, radius 4px, filled with the status tokens like the lozenge, task bars with a type icon and the status in their tooltip, plain rows on `--card` with a border, not-found dashed; 6px ends resize with `ew-resize`. A bar cut by the range edge loses its rounded corner on that side; one fully outside shows a chevron at the edge. Tree: 16px indent per level, a chevron before rows with children (titles in semibold), hover actions at the row end on a card background: open in the tracker (task rows; the only link on a row, so a drag never opens it), add a task under, outdent, indent, remove. Summary bar: same 20px bar with its label, task parents in their status color, plain parents in `--foreground` at 75% with `--background` text; 2px ticks down at both ends; drags as a whole to move the branch; its ends stretch the parent's own dates and stop at its children. Footer: one ghost "+ Add" button; its popover has tabs for the tracker (named after it; the Jira card form with keys, links or JQL) and "Plain task" (a title field).
- Gantt milestones and dependencies: a milestone is a 10px `--foreground` diamond with its 11px title in the timeline's footer lane and a 1px dashed line at 40% up to the header; drag it in whole days, double-click to rename, × on hover. Dependency lines are 1.25px `--foreground` at 55% with a filled arrowhead, elbowed from a bar's end to the next bar's start, in `--warning` when the next bar starts before the first ends; a picked line is 2px `--primary` with a round × on its middle. A 10px `--primary` ring past each bar's end shows on row hover and draws a dashed line to the row it is dropped on. Controls gain "Milestone". Dates never sit on the chart: hovering a bar shows a tooltip above it on `--foreground` at 80% with `--background` text, 11px, radius 4px: "Mon Oct 5 – Fri Oct 16 · 12 days" in semibold tabular figures over the label and status at 70%. While the bar or its end is dragged the tooltip moves below the bar, keeps only the dates and drops to 55%, so the bars above stay visible. It flips to end at the bar's end near the right edge. A hovered or dragged milestone shows its date in muted text after its title.
- No canvas library attribution label (`proOptions.hideAttribution`).
- Icons: lucide, stroke 1.75.
- Jira card: one inline flow like the Confluence issue macro: type icon, key (link to Jira), title, status lozenge. Long titles wrap from the left edge and are cut at 120 characters so the lozenge stays visible. States: collapsed (icon, key, lozenge; the key is plain text so the whole card opens the mini-card), inline (with title), expanded (popover on click: assignee, priority, updated, "Collapse card" and "Open in Jira"). Closed task: key struck through, title muted.
- Sync indicator in the top right: a 10px dot and "Synced 12s ago", never error text. Dot: green when every tracker syncs, amber when some fail, red when none sync or the drawhl server does not answer (`--sync-ok`, `--sync-partial`, `--destructive`). Clicking it opens a `Popover` below with one row per tracker: dot, name, "Synced N ago", and the reason with the next try under a failing one.
- Focus capsule: floating, top center, 264px wide, the same size in every state. One block with two sections: a 56px dial with a 26px top radius over a 36px row on `--card`, 12px radius at the bottom. Dial: state icon in a round tint on the left (timer idle, target focus, cup break, pause, bell when a phase ends), `MM:SS` in 28px JetBrains Mono tabular, round dots under it, a round 34px play button in the dial's ink on the right. Only the state icon has a tooltip ("Focus · round 2 of 4"), styled like the Gantt date tooltip. The dial fill is a slow two-hue gradient at the status lozenge lightness (`--focus-fill-l`, deep tints in the dark theme): idle gray, focus from green (hue 150) through sand and peach to raspberry (hue 8) by progress, paused blue, break lavender; a finished focus pulses a raspberry ring three times. The row is the player: a 3-bar equalizer (moves while music plays), track title with the author muted, play or pause, next, and a sliders button that opens a `Popover` centered under the whole capsule (200ms fade, scale and slide): Timer and Music tabs. Timer: skip and reset, steppers for lengths and rounds, switches for sound, notification and auto start. Music: numbered track list with durations (current one in semibold on `--muted`; own tracks show a × over the duration on hover, "this tab only" after the author when the browser refused to keep it), "Add your own tracks" with a 12px muted line under it once own tracks exist ("Your files: 112 MB in this browser." and whether they are protected from cleanup) and a `--destructive` line naming files that could not be kept, volume, "Pause music on breaks", credits. Shown or hidden with "Focus timer" in the main menu.
- Timer: a 40px cube, radius 8px, `--timer` fill with a faint shadow, a 14px alarm clock over the time left in 11px JetBrains Mono semibold ("45s", "28m", "3h", "2d"). Attached to an element it sits 6px left of the element's top edge, which does not move when a card grows or collapses; dragged onto an element it attaches there, dropped within 48px of its element it stays, further away it comes free. Under 5 minutes: a 2px `--timer-fired` ring with a gap; gone off: `--timer-fired` with a bell and a soft ring pulsing every 1.6s; done: `--muted` with a check. Hover shows a tooltip like the Gantt one: the note in semibold over the moment in the user's locale and the time left. Click opens a `Popover` to the right: "Attached to DEMO-1", the note (`Textarea`), one field that takes durations and dates with the hint "30m, 2h, tomorrow 10:00, 25.10 15:00", preset chips (15m, 30m, 1h, 2h, Tomorrow 10:00), a status line ("Goes off чт, 08.10.2026, 15:30 · in 1 d 3 h", errors in `--destructive`), and Done, +10 min, +1 hour (or Mark done) with a delete icon at the end. Timer tool in the toolbar after Text, shortcut `R`; "Add timer" in both context menus.
- Timer notes: cards at the top right under the sync indicator, 288px, one per timer that went off (up to 3, then "2 more timers went off"): a 24px coral cube with a bell, the note in medium, "On DEMO-1 · Went off at 15:30" muted, and Done, +10 min, +1 hour. Clicking the note moves the board to the timer at no less than 80% zoom and flashes the cube. A dismissable line above them counts timers that went off while the board was closed. The tab title starts with "(N)" while N timers are gone off.
- About: icon button in the bottom left, same surface as the top bar; a small `--primary` dot on it when a newer release exists. A `Popover` above it: name and running version (links to its release), an accent block "vX is available" with "See what's new" and "How to upgrade" when there is one, one-line description, links to GitHub, documentation and issues, license.

## Motion
- Card expand and collapse 120ms ease-out, popover 100ms fade-scale.
- Status change: the lozenge softly highlights once (400ms).
- Timer: a gone-off cube pulses a coral ring until it is done or snoozed; a cube the board moved to scales up and back three times (400ms).
- Pan and zoom with no inertia effects beyond the xyflow defaults.
- Focus capsule: the dial gradient drifts over 9s and stops while idle or paused; the end of a focus pulses three times.
- `prefers-reduced-motion`: all animations except pan are disabled.

## Copy
English, short and to the point, no exclamation marks. Buttons start with a verb: "Add card", "Refresh all", "Connect Jira". Errors name the cause and the action: "Jira returned 401. Check your token in Settings."

## Don'ts
- Handwritten fonts and "sketchy" lines.
- A colored canvas and colored panels: color only on statuses, sticky notes and frames.
- Side panels open by default. The canvas takes the whole screen.
- Shadows on cards on the canvas.
- The Jira logo and Atlassian icon sets in the bundle. The task type icon is the `iconUrl` from the user's Jira response (their own instance), with a neutral lucide icon as a fallback.
