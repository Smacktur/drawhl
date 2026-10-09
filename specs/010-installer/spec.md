# Feature Specification: One-command installer

**Feature Branch**: `010-installer`

**Created**: 2026-10-09

**Status**: Draft, awaits G2

**Input**: Owner, 2026-10-09: "A full installer for any system: it checks Docker and resources, installs what is missing, creates the folders and the password. In the future something like `tiko.run/install`, so a person runs one command in a terminal and gets everything." Plus a step-by-step Docker guide for people who never used it. G1 approved by the owner on 2026-10-09: Colima as the default Docker on macOS, the `tiko.run` domain through Cloudflare (not pointed straight at GitHub Pages, because the apex is kept for a future hosted tiko).

## Why

Today self-hosting needs Docker with Compose and three commands. People who do not know Docker stop at step zero. The launch on HN and Reddit sends exactly those people to the README. Coolify, Ollama, Tailscale, k3s, Bun and uv all install with one line; that is the expected entry point for a self-hosted tool.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - One line on Linux or macOS (Priority: P1)

A person on a fresh Ubuntu server, a Debian laptop or a Mac runs `curl -fsSL https://tiko.run/install.sh | sh`. The script says what it will do, checks the machine, installs Docker if it is missing (after a yes), creates the tiko folder with a generated password and secret key, starts the release images and prints the address, the username `admin` and the password.

**Why this priority**: most self-hosters and most HN readers are on Linux servers and Macs.

**Independent Test**: on a clean Ubuntu 24.04 VM without Docker run the line, answer yes: after the script ends, the printed address opens the sign-in screen and the printed password signs in as `admin`. Run the line again: it upgrades to the latest release, keeps the password, the boards and `.env`.

**Acceptance Scenarios**:

1. **Given** Docker with Compose is installed and running, **When** the script runs, **Then** it does not touch Docker and goes straight to the tiko folder.
2. **Given** Linux without Docker, **When** the person agrees, **Then** the script installs Docker Engine and the Compose plugin with the official `get.docker.com` script, starts and enables the service, and continues. It asks for `sudo` only for this step.
3. **Given** macOS without Docker and with Homebrew, **When** the person agrees, **Then** the script installs Colima, the Docker CLI and the Compose plugin with Homebrew, starts Colima with 2 CPU, 2 GB memory and 10 GB disk, and continues. Without Homebrew it prints the two options (install Homebrew, or Docker Desktop with a note on its license for companies over 250 people) and stops.
4. **Given** Docker is installed but the daemon is stopped, **Then** the script starts it (systemd on Linux, `colima start`, Docker Desktop or OrbStack on macOS, the same way `scripts/ensure-docker.sh` does) and waits up to 2 minutes.
5. **Given** less than 1 GB of memory, less than 2 GB free disk at the target folder, a 32-bit CPU or an unsupported OS, **Then** the script stops before changing anything and says what is missing. Under 2 GB memory it warns and continues.
6. **Given** the port is taken, **Then** the script stops and says to set `TIKO_PORT`.
7. **Given** a successful start, **Then** the script waits until the web port answers, prints the address (`http://localhost:<port>`, plus the server's IP when it has no desktop), `admin` and the password, and where `.env` and `data/` live.
8. **Given** the script runs again in the same folder, **Then** it pulls the latest release and restarts; `.env` and `data/` are never overwritten.
9. **Given** `--yes` or `TIKO_YES=1`, **Then** nothing is asked. When piped from curl, questions are read from `/dev/tty`; with no terminal and no `--yes`, the script stops and says to add `--yes`.

---

### User Story 2 - One line on Windows (Priority: P2)

A person on Windows 10 or 11 opens PowerShell and runs `irm https://tiko.run/install.ps1 | iex`. The script checks the system, enables WSL 2 and installs Docker Desktop with `winget` if they are missing (after a yes and with an admin prompt), asks for a restart when Windows needs one, and after the restart the same line finishes the job: folder, password, start, address. The browser opens on tiko.

**Why this priority**: Windows users are fewer among self-hosters, and Docker on Windows always needs Docker Desktop, WSL 2 and often a restart; this cannot be one uninterrupted step.

**Independent Test**: on a clean Windows 11 VM run the line, agree, restart when asked, run the line again: the browser opens the sign-in screen and the printed password signs in.

**Acceptance Scenarios**:

1. **Given** Docker Desktop is installed and running, **Then** the script goes straight to the tiko folder `%USERPROFILE%\tiko`.
2. **Given** WSL 2 is missing, **Then** the script runs `wsl --install --no-distribution` elevated and says to restart and run the same line again.
3. **Given** Docker Desktop is missing, **Then** the script installs it with `winget install -e --id Docker.DockerDesktop` and starts it, waiting up to 3 minutes for `docker info`. Without `winget` it prints the Docker Desktop download link and stops.
4. **Given** less than 4 GB of memory or virtualization off in the firmware, **Then** the script stops before changing anything and says what to do.
5. Re-run, `-Yes` and the end-of-run output behave as in US1.

---

### User Story 3 - A guide for people who never used Docker (Priority: P2)

The user guide gets an "Install" page: the one-line commands first, then a manual path per system with screenshots-free numbered steps: install Docker (Docker Desktop on Windows and macOS, Docker Engine on Ubuntu and Debian), check it with `docker run hello-world`, download `compose.release.yml`, start, open the address, find the password. Plus how to update, stop and uninstall, and what to do when a step fails (virtualization off, WSL error, permission denied on the Docker socket, port taken).

**Independent Test**: a person who never used a terminal follows the page on their system without asking anyone (owner checks with one such person).

### Edge Cases

- Behind a corporate proxy: the script respects `HTTPS_PROXY`; Docker's own proxy settings are out of scope and linked from the guide.
- `TIKO_DIR` points to a folder with an older `compose.release.yml`: it is replaced; `.env` and `data/` are kept.
- An install made by hand with `compose.release.yml` in another folder: the script works only in its own folder and does not look for others.
- The person runs the script as root on Linux: the folder is `/opt/tiko`; as a regular user it is `~/tiko`.
- Docker installed but the user is not in the `docker` group: the script uses `sudo docker` for this run and prints how to add the group.
- `get.docker.com` does not support the distribution (for example Arch or Alpine): the script stops and points to the distribution's Docker docs.
- Download of the script is cut in the middle: the whole script is one function called on the last line, so a partial file does nothing.
- Uninstall: `docker compose down` in the folder, then delete the folder; the guide says this and warns that `data/` holds the boards.

## Requirements *(mandatory)*

- **FR-001**: `install.sh` is POSIX `sh` (runs in `dash` and macOS `sh`), passes `shellcheck`, and is wrapped in one `main` function.
- **FR-002**: The script installs the latest GitHub release: `compose.release.yml` is downloaded from `https://github.com/tiko-run/tiko/releases/latest/download/compose.release.yml`, attached to each release by the release workflow with its `TAG` pinned. `TIKO_VERSION` picks another release.
- **FR-003**: `.env` is created only when absent, with mode 0600, holding a random 20-character `TIKO_PASSWORD` and a 32-byte base64 `TIKO_SECRET_KEY`, plus `TIKO_PORT`.
- **FR-004**: `compose.release.yml` maps `${TIKO_PORT:-3000}:3000`; nothing else in it changes.
- **FR-005**: The scripts never print the secret key and print the password once, at the end.
- **FR-006**: Settings come from ENV with flags as a shortcut: `TIKO_DIR`, `TIKO_PORT`, `TIKO_VERSION`, `TIKO_YES` (`--yes`, `-Yes`).
- **FR-007**: No new runtime dependency for tiko. The script needs only `curl` or `wget`, `uname`, `df` and what Docker installation brings.
- **FR-008**: The scripts are served at `https://tiko.run/install.sh` and `https://tiko.run/install.ps1`; until the domain is set up, at `https://tiko-run.github.io/tiko/install.sh` and `.ps1`. Both come from the repository, so the published script is always the one on `main`.

## Success Criteria *(mandatory)*

- **SC-001**: From a clean Ubuntu 24.04 VM without Docker to a signed-in board in under 5 minutes on a normal connection.
- **SC-002**: The same on macOS with Homebrew and without Docker.
- **SC-003**: On Windows 11 without WSL: two runs of the same line and one restart.
- **SC-004**: A second run on any system keeps boards and the password.
- **SC-005**: CI runs `shellcheck`, `PSScriptAnalyzer` and a full `install.sh --yes` on an Ubuntu runner on every change to the scripts.

## Out of scope

- A native Windows install without Docker Desktop, Podman, Kubernetes, Helm.
- HTTPS and a public domain for the instance (a reverse proxy guide is a later page).
- The Railway and Render templates: they are rebuilt by hand by the owner; a Render deploy button needs a paid disk and is a separate decision.
- The hosted tiko on the `tiko.run` apex.
