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
- Keyboard shortcuts for tools (V, H, F, S, T, C), copy and paste at the cursor, duplicate and select all; press ? for the full list.
- Add several Jira cards at once: separate keys or links with commas, and they are laid out in a grid. Keys that fail stay in the field with their errors.
- Draw a frame by dragging; a new frame takes in the elements under it.
- The canvas keeps gliding briefly after a quick mouse pan.

### Changed

- Cards are added from the "Jira card" tool in a floating toolbar at the bottom; the card input no longer stays on the canvas.
- Closing a menu or dialog with the mouse no longer leaves a focus ring on the button that opened it.
- The board panel is replaced by a compact top bar: a main menu with Settings and Theme (Light, Dark, System; kept in the browser) and the board name with a menu to switch or create boards. The canvas library label is gone.
