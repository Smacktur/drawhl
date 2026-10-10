#!/bin/sh
# Prepares a fresh git worktree: `make check` passes and `make up` does not collide with
# the stack of another worktree. Run from the worktree root; safe to run again.
set -eu

# The backend needs nothing: `uv run` builds backend/.venv on first use.
(cd frontend && npm ci)

# Each worktree gets its own compose project and ports; the main checkout keeps 3000 and 8000.
if ! grep -q '^COMPOSE_PROJECT_NAME=' .env 2>/dev/null; then
  name=$(basename "$PWD" | tr 'A-Z' 'a-z' | tr -c 'a-z0-9\n' '-')
  offset=$(($(printf %s "$name" | cksum | cut -d' ' -f1) % 900 + 1))
  printf '\nCOMPOSE_PROJECT_NAME=tiko-%s\nTIKO_PORT=%s\nTIKO_API_PORT=%s\n' \
    "$name" $((3000 + offset)) $((8000 + offset)) >>.env
fi
