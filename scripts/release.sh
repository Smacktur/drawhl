#!/usr/bin/env bash
# Cut a CalVer release vYYYY.M.N: UTC year and month, N counts releases in that month from 0, so a
# hotfix on the same day gets the next number. Moves CHANGELOG.md "Unreleased" into a version
# section, commits, tags and pushes. The tag starts .github/workflows/release.yml.
#
# Usage: scripts/release.sh [--dry-run]
set -euo pipefail

[ "$(git branch --show-current)" = main ] || { echo "release from main only"; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "working tree is not clean"; exit 1; }
git fetch -q origin main --tags
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || { echo "main differs from origin/main"; exit 1; }

month="$(date -u +%Y).$(date -u +%-m)"
last="$(git tag -l "v$month.*" | sed "s/^v$month\.//" | grep -E '^[0-9]+$' | sort -n | tail -1)"
version="$month.$(( ${last:--1} + 1 ))"
tag="v$version"

unreleased="$(awk '/^## \[Unreleased\]/ {on=1; next} on && /^## \[/ {exit} on' CHANGELOG.md)"
[ -n "$(echo "$unreleased" | tr -d '[:space:]')" ] || { echo "CHANGELOG.md Unreleased is empty"; exit 1; }

python3 - "$version" <<'PY'
import datetime, pathlib, sys
version = sys.argv[1]
path = pathlib.Path("CHANGELOG.md")
today = datetime.datetime.now(datetime.UTC).date().isoformat()
text = path.read_text()
path.write_text(text.replace("## [Unreleased]\n", f"## [Unreleased]\n\n## [{version}] - {today}\n", 1))
# The running app reports this version in About and compares it with the latest release.
pathlib.Path("backend/app/version.py").write_text(
    "# Bumped by scripts/release.sh in the release commit; a source build shows the last release.\n"
    f'VERSION = "{version}"\n'
)
PY

if [ "${1:-}" = "--dry-run" ]; then
  git diff
  git checkout -- CHANGELOG.md backend/app/version.py
  echo "dry run: would tag $tag"
  exit 0
fi

make check
git commit -q -am "chore(release): $tag"
git tag -a "$tag" -m "$tag"
git push origin main "$tag"
echo "pushed $tag; images and the GitHub release: $(git remote get-url origin | sed 's/\.git$//')/actions"
