---
title: Install
description: Install tiko on Linux, macOS or Windows with one command or step by step.
---

tiko runs in Docker on your own machine or server. The installer does everything for you; the manual steps below are for when you want to see each step or the installer cannot help.

## One command

On Linux or macOS, open a terminal and run:

```bash
curl -fsSL https://tiko-run.github.io/tiko/install.sh | sh
```

The installer:

1. Checks the machine: 64-bit Linux or macOS, at least 1 GB of memory (2 GB is better), 2 GB of free disk, a free port.
2. Installs Docker if it is missing, after asking: Docker Engine from [get.docker.com](https://get.docker.com) on Linux, [Colima](https://github.com/abiosoft/colima) with Homebrew on macOS.
3. Creates the folder `~/tiko` (`/opt/tiko` when run as root on Linux) with a generated password and secret key in `.env`.
4. Starts the latest release and prints the address, the username `admin` and the password.

Options go after `sh -s --`, for example `curl -fsSL https://tiko-run.github.io/tiko/install.sh | sh -s -- --yes --port 8080`:

| Option | Environment variable | What it does |
|---|---|---|
| `--yes` | `TIKO_YES=1` | Agree to everything, ask nothing |
| `--dir DIR` | `TIKO_DIR` | Install into another folder |
| `--port PORT` | `TIKO_PORT` | Serve on another port instead of 3000 |
| `--version 2026.10.12` | `TIKO_VERSION` | Install a specific release |

Run the same command again to upgrade: it keeps your boards, accounts and `.env`.

Windows gets its own one-line installer soon. Until then, follow the Windows steps below.

## Step by step

### 1. Install Docker

Docker runs tiko in containers, so nothing else gets installed on your system.

**Windows 10 or 11**

1. Check that virtualization is on: open Task Manager → Performance → CPU and look for "Virtualization: Enabled". If it says Disabled, turn on Intel VT-x or AMD-V in your computer's BIOS or UEFI settings.
2. Download [Docker Desktop for Windows](https://docs.docker.com/desktop/setup/install/windows-install/) and run the installer. Keep "Use WSL 2 instead of Hyper-V" checked.
3. Restart the computer when the installer asks.
4. Open Docker Desktop from the Start menu, accept the terms and wait until the bottom left corner says "Engine running".

**macOS**

Pick one:

- [Docker Desktop for Mac](https://docs.docker.com/desktop/setup/install/mac-install/): download the version for your chip (Apple menu → About This Mac shows "Apple" or "Intel"), drag it to Applications, open it and wait until it says "Engine running".
- Colima, free and without a window, if you have [Homebrew](https://brew.sh):

  ```bash
  brew install colima docker docker-compose
  mkdir -p ~/.docker/cli-plugins
  ln -sfn "$(brew --prefix)/opt/docker-compose/bin/docker-compose" ~/.docker/cli-plugins/docker-compose
  colima start
  ```

Docker Desktop is free for personal use, education and companies under 250 people and $10 million in revenue; larger companies need a paid plan. Colima has no such limit.

**Ubuntu or Debian**

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

Sign out and back in, so you can run `docker` without `sudo`. Other distributions: [Docker Engine install guide](https://docs.docker.com/engine/install/).

**Check it**

In a terminal (PowerShell on Windows):

```bash
docker run hello-world
docker compose version
```

The first command prints "Hello from Docker!", the second a version like `v2.x`.

### 2. Start tiko

Linux and macOS:

```bash
mkdir ~/tiko && cd ~/tiko
curl -fsSL https://github.com/tiko-run/tiko/releases/latest/download/compose.release.yml -o compose.yaml
docker compose up -d
```

Windows, in PowerShell:

```powershell
mkdir $HOME\tiko; cd $HOME\tiko
Invoke-WebRequest https://github.com/tiko-run/tiko/releases/latest/download/compose.release.yml -OutFile compose.yaml
docker compose up -d
```

The first start downloads about 130 MB.

### 3. Sign in

Open http://localhost:3000 and sign in as `admin`. The password is generated on the first start; find it with:

```bash
docker compose logs api | grep 'tiko password'
```

On Windows: `docker compose logs api | Select-String 'tiko password'`. Change it in Settings → Security. To pick your own from the start, put `TIKO_PASSWORD=...` into a file named `.env` next to `compose.yaml` before the first start; see [Configuration](../configuration/).

## Everyday commands

Run these in the tiko folder:

| Task | Command |
|---|---|
| Stop | `docker compose down` |
| Start again | `docker compose up -d` |
| See logs | `docker compose logs -f` |
| Upgrade | the one-line installer again, or `docker compose pull && docker compose up -d` |
| Uninstall | `docker compose down`, then delete the folder |

The folder's `data/` holds your boards, so back it up before deleting anything. More in [Data and upgrades](../data-and-upgrades/).

## When something goes wrong

- **"permission denied" on `/var/run/docker.sock` (Linux).** Your user is not in the `docker` group yet: run `sudo usermod -aG docker $USER`, sign out and back in, or prefix commands with `sudo`.
- **"port is already allocated" or the installer says the port is taken.** Another program uses port 3000. Use `--port 8080` with the installer, or set `TIKO_PORT=8080` in `.env`, then open http://localhost:8080.
- **"Cannot connect to the Docker daemon".** Docker is not running: open Docker Desktop, run `colima start` on macOS, or `sudo systemctl start docker` on Linux.
- **WSL errors on Windows.** Run `wsl --update` in PowerShell as administrator and restart. Docker's [troubleshooting page](https://docs.docker.com/desktop/troubleshoot-and-support/troubleshoot/) covers the rest.
- **The installer says tiko already runs from another folder.** One machine runs one tiko: stop the other with `docker compose down` in its folder, or upgrade it with `--dir` pointing there.
- **Behind a corporate proxy.** The installer follows `HTTPS_PROXY`; Docker needs its own [proxy settings](https://docs.docker.com/engine/daemon/proxy/).

Still stuck? Open an [issue](https://github.com/tiko-run/tiko/issues) with the installer's output.
