# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [CalVer](https://calver.org/) `YYYY.M.D`, the release date. `make release` moves Unreleased into a version section.

## [Unreleased]

### Added

- Focus timer: a pomodoro capsule at the top center of the screen. Start 25 minutes of focus with one click; a chime and a browser notification mark the end, then a 5 minute break, and a 15 minute one after every fourth round. The capsule's color shows the state: gray at rest, green warming to raspberry as the focus runs out, blue on pause, lavender on a break; hover its icon for the state and round. The sliders button sets the lengths, rounds, sound, notification and auto start, and skips or resets the cycle. The countdown survives a reload. Hide it from the main menu.
- Arrows can point at a spot instead of an element: drag an arrow from a handle and release it over empty space. Its free end shows a dot on hover; drag it to point elsewhere. Deleting the arrow removes its free end too.
- Smart guides: a dragged element snaps to the edges and centers of the others on screen and to an equal gap in a row or column, with dashed alignment lines and gap markers like in Miro. Resizing snaps to the width or height of the others and marks each element of that size. Hold Alt to move or resize freely. The sticky color bar and module controls hide while you drag.
- About button in the bottom left: what drawhl is, the running version with a link to its release notes, and links to the source on GitHub, documentation and issues.
- Modules: interactive blocks added from the Modules button in the toolbar (`M`) or the right-click menu. The first one is Gantt: a timeline over days, weeks, months or quarters, with its own name (double-click the header), a line for today, start and end dates, and "+" buttons that add a calendar quarter on either side. Stretch the block to give each day more room.
- Gantt rows: drop a Jira card onto a Gantt to plan it as a bar at the drop date, or use "Add" in the module: a task from the tracker by key, link or JQL, or a plain task that lives only on the board. Bars show the task's live status color, and done tasks are struck through. Drag a bar to move it, drag its ends to change the dates, drag a row's label to reorder it, or drag it out onto the board to turn it back into a card (plain rows become sticky notes). Plan dates stay on the board and are never written to Jira. Drag the border of the task column to show more of the titles.
- Gantt rows form a tree: nest tasks and plain rows under each other up to five levels by dragging a row label right or with the indent buttons, and add a row under any row. A row with children keeps its own dates and always covers its children (a task keeps its key, title and status color): stretch it wider than its children, drag it to move the whole branch, and collapse it. A child that moves past its parent's edge pushes the parent out. A task row opens in the tracker from its own link button, so dragging never opens it by accident. Deleting a parent keeps its children one level up.
- Gantt milestones and dependencies: add a milestone from the module controls, rename it with a double-click and drag it to its date. Drag the dot past a bar's end onto another row to say that row starts after this one; the line follows both bars and turns amber when the second one starts before the first ends. Click a line to remove it; deleting a row removes its lines. Hover a bar to see its exact dates and length; they follow the bar while you drag it or its ends. A milestone shows its date on hover.
- Update notice: when a newer drawhl release is out, the About button gets a dot and the panel links to what's new and how to upgrade. The server asks GitHub at most every 6 hours; `UPDATE_CHECK=false` turns it off.

### Changed

- The Theme item in the main menu has an icon.
- The sync indicator shows only a colored dot and the last sync time: green when every tracker syncs, amber when some fail, red when none do. Click it to see each tracker with its last sync and the reason it fails.

### Fixed

- A plain Gantt row's title opens for editing on a double-click again.
- A selection box no longer picks up a frame or element that was dragged earlier and sits outside the box.
- Syncing resumes on its own on the next tick after the network or VPN comes back, instead of waiting out a backoff of up to five minutes. Only rate limits and Jira server errors slow polling down now.

## [2026.10.6] - 2026-10-06

### Added

- Boards on an infinite canvas: add Jira task cards by key or link, pan, zoom and drag; boards save automatically and reopen as left. Works out of the box with built-in demo tasks.
- Connect Jira Data Center with a personal access token in Settings; the token is encrypted at rest with `DRAWHL_SECRET_KEY` and never sent back to the browser.
- Card statuses refresh on their own while a board is open (every 30 s by default, configurable), with one batched Jira request per board, an "updated N s ago" indicator, "Refresh all" and automatic backoff when Jira struggles. Closed tasks are struck through.
- Frames, sticky notes, free text and arrows. Drop cards and notes into a frame to group them; moving the frame moves everything inside, and deleting it keeps the contents. Box-select or shift-click to move or delete several items.
- Right-click menu on the canvas: add a Jira card, frame, sticky note or text at the clicked spot, or delete the selection.
- Keyboard shortcuts for tools (V, H, F, N, T, C), copy and paste at the cursor, duplicate and select all; press ? for the full list.
- Add several Jira cards at once: separate keys or links with commas, and they are laid out in a grid. Keys that fail stay in the field with their errors.
- Draw a frame by dragging; a new frame takes in the elements under it.
- Click a card to open a mini-card with assignee, priority, last update and an "Open in Jira" link. Collapse cards to a single line with key and status from the mini-card or, for the whole selection, from the right-click menu; the state is saved with the board.
- Rename or delete the current board from the board menu; deleting asks first.
- Add cards by JQL: type a query such as `project = DEV AND status != Done` into the Jira card input, and up to 50 matching tasks are laid out in a grid. Jira's own error is shown for a broken query.
- JQL suggestions in the Jira card input, from your own Jira: field names (custom fields too), the operators each field allows, values such as statuses and people, then AND, OR or ORDER BY. Tab inserts a suggestion. Before you press Enter, the hint shows how many tasks match or Jira's error.
- Undo and redo on the board: Cmd/Ctrl+Z takes back a move, resize, delete, edit or new element, Cmd/Ctrl+Shift+Z or Ctrl+Y brings it back. A drag is one step; text fields keep their own undo.
- `make backup` saves a timestamped copy of the database to `data/backups/`; `make up` runs it before every rebuild.

### Changed

- Cards are added from the "Jira card" tool in a floating toolbar at the bottom; the card input no longer stays on the canvas.
- Closing a menu or dialog with the mouse no longer leaves a focus ring on the button that opened it.
- The board panel is replaced by a compact top bar: a main menu with Settings and Theme (Light, Dark, System; kept in the browser) and the board name with a menu to switch or create boards. The canvas library label is gone.
- The Jira card input grows with the text and keeps line breaks, so a long or pasted multi-line JQL query stays readable; Shift+Enter starts a new line. Suggestions open above the input, so it no longer jumps while you type.
