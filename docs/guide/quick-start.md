---
title: Quick start
category:
  uri: Getting Started
position: 1
---

You need Docker with Compose.

## From released images

No checkout needed:

```bash
mkdir drawhl && cd drawhl
curl -fsSLO https://raw.githubusercontent.com/Smacktur/drawhl/main/compose.release.yml
docker compose -f compose.release.yml up -d
```

## From source

```bash
git clone https://github.com/Smacktur/drawhl.git
cd drawhl
docker compose up --build
```

## First look

Open http://localhost:3000. A fresh install opens on a sample board built from demo tasks. Move things around, then add more with the card tool at the bottom: type `DEMO-5` for one task, or `project = DEMO` for all twelve. Delete the sample board when you are done with it.

No keys or accounts are needed for the demo. To see your real tasks, [connect Jira Data Center](jira-data-center).
