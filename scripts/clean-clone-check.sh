#!/usr/bin/env bash
# Clone origin/main into a temp dir and bring it up exactly as the README says,
# without .env or API keys, then run the smoke scenario.
#
# Usage: scripts/clean-clone-check.sh [timeout_sec]
set -euo pipefail

TIMEOUT="${1:-300}"
REPO_URL="$(git remote get-url origin)"
WORKDIR="$(mktemp -d)"
# `make smoke` runs `docker compose exec`, so the project name goes through the env.
export COMPOSE_PROJECT_NAME="cleancheck$$"

cleanup() {
  (cd "$WORKDIR/repo" 2>/dev/null && docker compose down -v --remove-orphans >/dev/null 2>&1) || true
  rm -rf "$WORKDIR"
}
trap cleanup EXIT

git fetch -q origin
if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
  echo "WARN: local HEAD != origin/main — checking what is PUSHED, not local"
fi

"$(dirname "${BASH_SOURCE[0]}")/ensure-docker.sh"

echo "==> Cloning $REPO_URL"
git clone -q --depth 1 "$REPO_URL" "$WORKDIR/repo"
cd "$WORKDIR/repo"

echo "==> Secrets scan"
if command -v gitleaks >/dev/null; then
  gitleaks detect --no-banner --redact -s . || { echo "FAIL: secrets found"; exit 1; }
else
  echo "SKIP: gitleaks not installed"
fi

echo "==> Required files"
required="README.md .env.example docker-compose.yml THIRD_PARTY.md"
grep -q '^profile: oss' .copier-answers.yml && required="$required LICENSE CONTRIBUTING.md CODE_OF_CONDUCT.md SECURITY.md CHANGELOG.md"
for f in $required; do
  [ -f "$f" ] && echo "  ok  $f" || { echo "  MISSING $f"; exit 1; }
done

echo "==> docker compose up (no .env, no keys)"
start=$(date +%s)
docker compose up --build -d --wait --wait-timeout "$TIMEOUT" \
  || { docker compose logs --tail 50; exit 1; }
echo "OK: healthy in $(( $(date +%s) - start ))s"

echo "==> make smoke"
make smoke

echo "==> CLEAN CLONE CHECK PASSED"
