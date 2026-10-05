# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Initial project skeleton.
- Boards on an infinite canvas: add Jira task cards by key or link, pan, zoom and drag; boards save automatically and reopen as left. Works out of the box with built-in demo tasks.
- Connect Jira Data Center with a personal access token in Settings; the token is encrypted at rest with `DRAWHL_SECRET_KEY` and never sent back to the browser.
- Card statuses refresh on their own while a board is open (every 30 s by default, configurable), with one batched Jira request per board, an "updated N s ago" indicator, "Refresh all" and automatic backoff when Jira struggles. Closed tasks are struck through.

### Changed

- Cards are added from the "Jira card" tool in a floating toolbar at the bottom; the card input no longer stays on the canvas.
