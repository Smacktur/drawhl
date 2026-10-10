---
title: Task trackers
description: Which task trackers tiko supports today and which are planned.
---

tiko reads tasks from your tracker and never changes them. Each person connects their own token, so a card shows only what that person's tracker access allows.

| Tracker | Status |
|---|---|
| Demo tasks (built in) | Available |
| Jira Data Center and Server 8.14+ | Available, see [Connect Jira Data Center](../jira-data-center/) |
| Jira Cloud | Planned |
| GitHub Issues | Planned |
| Linear | Planned |
| Plane | Planned |
| Todoist | Planned |
| TickTick | Planned |
| Windshift | Planned |

The demo tasks need no keys or accounts, so a fresh install has something to show.

## Add a tracker

tiko talks to trackers through one provider interface, so a new tracker does not touch the board. That makes a provider a good first contribution: see [Architecture](../architecture/) for the interface and [CONTRIBUTING.md](https://github.com/tiko-run/tiko/blob/main/CONTRIBUTING.md) for the setup.

Missing your tracker? Vote or ask in [Discussions](https://github.com/tiko-run/tiko/discussions).
