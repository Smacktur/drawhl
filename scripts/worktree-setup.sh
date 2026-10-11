#!/bin/sh
# Prepares a fresh git worktree: `make check` passes and `make up` does not collide with
# the stack of another worktree. Run from the worktree root; safe to run again.
set -eu

# The backend needs nothing: `uv run` builds backend/.venv on first use.
(cd frontend && npm ci)

# Each worktree gets its own compose project and ports; the main checkout keeps 3000 and 8000.
here=$(git rev-parse --show-toplevel)
trees=$(git worktree list --porcelain | sed -n 's/^worktree //p')
main=$(printf '%s\n' "$trees" | head -n 1)
[ "$here" != "$main" ] || exit 0

project() { sed -n 's/^COMPOSE_PROJECT_NAME=//p' "$1" 2>/dev/null | tail -n 1; }
own=$(project .env)
# A .env copied from the main checkout brings that checkout's project along: not ours yet.
if [ -n "$own" ] && [ "$own" != "$(project "$main/.env")" ]; then
  exit 0
fi

# Another worktree holds the port in its .env, or something listens on it right now.
taken() {
  printf '%s\n' "$trees" | {
    while read -r tree; do
      [ "$tree" != "$here" ] && grep -qx "TIKO_PORT=$1" "$tree/.env" 2>/dev/null && exit 0
    done
    exit 1
  } && return 0
  nc -z localhost "$1" 2>/dev/null || nc -z localhost $(($1 + 5000)) 2>/dev/null
}

name=$(basename "$here" | tr 'A-Z' 'a-z' | tr -c 'a-z0-9\n' '-')
# The whole path counts, so two worktrees with one folder name do not land on one stack.
offset=$(($(printf %s "$here" | cksum | cut -d' ' -f1) % 900 + 1))
while taken $((3000 + offset)); do
  offset=$((offset % 900 + 1))
done

if [ -f .env ]; then
  grep -v -E '^(COMPOSE_PROJECT_NAME|TIKO_PORT|TIKO_API_PORT)=' .env >.env.new || true
  mv .env.new .env
fi
printf '\nCOMPOSE_PROJECT_NAME=tiko-%s-%s\nTIKO_PORT=%s\nTIKO_API_PORT=%s\n' \
  "$name" "$offset" $((3000 + offset)) $((8000 + offset)) >>.env
