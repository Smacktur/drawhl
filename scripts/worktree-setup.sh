#!/bin/sh
# Prepares a fresh git worktree: `make check` passes and `make up` does not collide with
# the stack of another worktree. Run from the worktree root; safe to run again.
set -eu

# The backend needs nothing: `uv run` builds backend/.venv on first use.
(cd frontend && npm ci)

# Each worktree gets its own compose project and ports; the main checkout keeps 3000 and 8000.
here=$(git rev-parse --show-toplevel)
trees=$(git worktree list --porcelain | sed -n 's/^worktree //p')
[ "$here" != "$(printf '%s\n' "$trees" | head -n 1)" ] || exit 0

value() { sed -n "s/^$2=//p" "$1" 2>/dev/null | tail -n 1; }
same() { [ -n "$1" ] && [ "$1" = "$2" ]; }

# Another checkout has this project, web port or API port in its .env.
held() {
  printf '%s\n' "$trees" | {
    while read -r tree; do
      [ "$tree" != "$here" ] || continue
      if same "$1" "$(value "$tree/.env" COMPOSE_PROJECT_NAME)" ||
        same "$2" "$(value "$tree/.env" TIKO_PORT)" ||
        same "$3" "$(value "$tree/.env" TIKO_API_PORT)"; then
        exit 0
      fi
    done
    exit 1
  }
}

# What .env has is kept unless it came with a copied .env or an older setup gave it to two.
own=$(value .env COMPOSE_PROJECT_NAME)
if [ -n "$own" ] && ! held "$own" "$(value .env TIKO_PORT)" "$(value .env TIKO_API_PORT)"; then
  exit 0
fi

if command -v nc >/dev/null; then
  busy() { nc -z localhost "$1" 2>/dev/null; }
else
  echo "worktree-setup: nc not found, ports other programs use are not checked" >&2
  busy() { false; }
fi

name=$(basename "$here" | tr 'A-Z' 'a-z' | tr -c 'a-z0-9\n' '-')
# The whole path counts, so two worktrees with one folder name do not land on one stack.
offset=$(($(printf %s "$here" | cksum | cut -d' ' -f1) % 900 + 1))
while held "" $((3000 + offset)) $((8000 + offset)) ||
  busy $((3000 + offset)) || busy $((8000 + offset)); do
  offset=$((offset % 900 + 1))
done

# .env holds passwords and keys: the rewritten file is private whatever it was before.
umask 077
if [ -f .env ]; then
  grep -v -E '^(COMPOSE_PROJECT_NAME|TIKO_PORT|TIKO_API_PORT)=' .env >.env.new || true
  mv .env.new .env
fi
printf '\nCOMPOSE_PROJECT_NAME=tiko-%s-%s\nTIKO_PORT=%s\nTIKO_API_PORT=%s\n' \
  "$name" "$offset" $((3000 + offset)) $((8000 + offset)) >>.env
