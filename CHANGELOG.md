# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Initial project skeleton.
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
- Add cards by JQL: type a query such as `project = SRE AND status != Done` into the Jira card input, and up to 50 matching tasks are laid out in a grid. Jira's own error is shown for a broken query.
- JQL suggestions in the Jira card input, from your own Jira: field names (custom fields too), the operators each field allows, values such as statuses and people, then AND, OR or ORDER BY. Tab inserts a suggestion. Before you press Enter, the hint shows how many tasks match or Jira's error.
- `make backup` saves a timestamped copy of the database to `data/backups/`; `make up` runs it before every rebuild.

### Changed

- Cards are added from the "Jira card" tool in a floating toolbar at the bottom; the card input no longer stays on the canvas.
- Closing a menu or dialog with the mouse no longer leaves a focus ring on the button that opened it.
- The board panel is replaced by a compact top bar: a main menu with Settings and Theme (Light, Dark, System; kept in the browser) and the board name with a menu to switch or create boards. The canvas library label is gone.
- The Jira card input grows with the text and keeps line breaks, so a long or pasted multi-line JQL query stays readable; Shift+Enter starts a new line. Suggestions open above the input, so it no longer jumps while you type.
