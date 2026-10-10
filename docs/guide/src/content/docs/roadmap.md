---
title: Roadmap
description: What is planned for tiko, roughly in order.
---

What we plan next, roughly in order. To ask for something sooner or suggest what is missing, start a thread in [Discussions](https://github.com/tiko-run/tiko/discussions).

## Working together

- Real-time boards: see other people's cursors and changes as they happen

## More trackers

- Jira Cloud, Linear, Plane, Todoist, TickTick, Windshift. The current list is in [Task trackers](../trackers/).

## Hosting

- One-click deploy on DigitalOcean
- tiko Cloud: tiko hosted by us, with a free plan, for those who do not want to run a server

## AI, opt-in and with your own key

- Bring your own model: OpenRouter, Claude, OpenAI or a local one
- Turn a sticky note into a task in your tracker
- MCP server, so AI agents can read your boards and arrange cards
- Voice notes with a local speech model

## Board

- Collection pins: drop a pin and pull matching tasks to it in a grid, by query or by a word in the title
- Subtasks, linked tasks and epic children, unfolded right from a card
- "Blocks" and "depends on" links next to plain arrows
- Task lists and tables from a query, with paging
- Images, GIFs, video and YouTube embeds

## Staying on top

- Comment counter on cards and a badge for new comments since your last visit
- Reminders on a card, delivered in the app, then by email, Telegram, Slack or Mattermost
- Live blocks from other tools, such as Grafana charts and Metabase numbers

## Current limits

- The tracker stays the source of truth: tiko doesn't change status or edit tasks.
- Statuses come from polling the open board, not webhooks.
- Boards are shared, but two people editing at once do not see each other live yet.
- Desktop only, English only.

What already shipped is in the [changelog](https://github.com/tiko-run/tiko/blob/main/CHANGELOG.md).
