---
title: Quick start
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

## On Railway

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/drawhl?referralCode=wFuy8y&utm_medium=integration&utm_source=button&utm_campaign=drawhl)

The template runs the released images: `api` keeps your boards on a volume, `web` is the only public service, and the key that encrypts tracker tokens and the password are generated on deploy. Sign in as `admin` with `DRAWHL_PASSWORD` from the `api` service's Variables. A tracker that is reachable only from a corporate network is out of reach from Railway.

To upgrade, redeploy `api` and `web`: they pull the latest release.

## First look

Open http://localhost:3000, or the Railway URL, and sign in as `admin`. On your machine the password is in the log: `docker compose logs api | grep 'drawhl password'`. A fresh install opens on a sample board built from demo tasks. Move things around, then add more with the card tool at the bottom: type `DEMO-5` for one task, or `project = DEMO` for all twelve. Delete the sample board when you are done with it.

No keys or accounts are needed for the demo. To see your real tasks, [connect Jira Data Center](../jira-data-center/).
