---
description: "Task list for One-command installer"
---

# Tasks: One-command installer

**Input**: [spec.md](spec.md), [plan.md](plan.md)

**Tests**: `shellcheck` and `PSScriptAnalyzer` in CI; `install.sh --yes` end to end in CI; manual runs on clean VMs.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Slice `feat/install-sh` — one line on Linux and macOS (US1, US3) 🎯

**Goal**: `curl -fsSL https://tiko-run.github.io/tiko/install.sh | sh` gives a signed-in board.

- [ ] T001 [US1] `compose.release.yml` port from `TIKO_PORT`; release workflow attaches it with `TAG` pinned
- [ ] T002 [US1] `install/install.sh`: flags and ENV, OS and arch, memory, disk, port, `/dev/tty` questions
- [ ] T003 [US1] Docker: detect, start the daemon, install via `get.docker.com` on Linux and Colima via Homebrew on macOS
- [ ] T004 [US1] Folder, `.env` once with mode 0600, download compose, pull, up, wait, print; re-run upgrades
- [ ] T005 [US1] Docs workflow publishes `install/*` with the guide; CI: `shellcheck` and an end-to-end `install.sh --yes`
- [ ] T006 [US3] Guide page "Install": one line, manual Docker on macOS, Ubuntu and Debian, update, uninstall, fixes; README quick start; `CHANGELOG.md`
- [ ] T007 [US1] Clean Ubuntu 24.04 VM without Docker; owner's Mac with Docker and with Colima; second run keeps data

**Checkpoint**: `make check`, CI install job, VM run → G3.

## Phase 2: Slice `feat/install-ps1` — one line on Windows (US2, US3)

- [ ] T008 [US2] `install/install.ps1`: checks, WSL 2, Docker Desktop via `winget`, restart handoff, folder, `.env`, start, open the browser
- [ ] T009 [US2] CI: `PSScriptAnalyzer` on a Windows runner
- [ ] T010 [US3] Guide page Windows part; README
- [ ] T011 [US2] Clean Windows 11 VM: two runs, one restart, signed in

**Checkpoint**: CI, VM run → G3.

## Phase 3: Slice `feat/tiko-run-domain` — install lines on tiko.run

**Needs**: the owner's Cloudflare setup from [plan.md](plan.md#domain-owner-outside-the-repository).

- [ ] T012 Guide `site` and `base` to `https://docs.tiko.run`; every link to the guide in the repository and the app
- [ ] T013 Install lines to `https://tiko.run/install.sh` and `.ps1` in README and the guide; curl both through the redirect

**Checkpoint**: both lines work from a clean machine → G3.
