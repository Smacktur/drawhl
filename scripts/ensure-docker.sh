#!/usr/bin/env bash
# Make sure the docker daemon answers. On macOS start Docker Desktop or OrbStack
# (whichever the current docker context points to) and wait until it is ready.
#
# Usage: scripts/ensure-docker.sh [timeout_sec]
set -euo pipefail

TIMEOUT="${1:-120}"

command -v docker >/dev/null || { echo "docker is not installed: Docker Desktop or OrbStack" >&2; exit 1; }
docker info >/dev/null 2>&1 && exit 0

if [ "$(uname)" != Darwin ]; then
  echo "docker daemon is not running: sudo systemctl start docker" >&2
  exit 1
fi

case "$(docker context show 2>/dev/null)" in
  orbstack) app=OrbStack ;;
  *) app=Docker ;;
esac
echo "==> starting $app, waiting up to ${TIMEOUT}s"
open -ga "$app"
for _ in $(seq "$TIMEOUT"); do
  docker info >/dev/null 2>&1 && { echo "    docker ready"; exit 0; }
  sleep 1
done
echo "docker daemon did not start in ${TIMEOUT}s" >&2
exit 1
