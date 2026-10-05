.PHONY: help up down backup logs dev-api dev-web test lint fmt check smoke release clean-clone stage-validate stage-env stage-smoke audit licenses

API_URL ?= http://localhost:8000
WEB_URL ?= http://localhost:3000
# Must match service names in render.yaml; Render adds a suffix if the subdomain is taken.
STAGE_API_URL ?= https://drawhl-api-stage.onrender.com
STAGE_WEB_URL ?= https://drawhl-web-stage.onrender.com

help:  ## list targets
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-14s %s\n", $$1, $$2}'

up: backup  ## back up data, build and start everything in docker (starts the daemon if needed)
	@scripts/ensure-docker.sh
	docker compose up --build -d
	@echo "API: $(API_URL)/docs"
	@echo "UI:  $(WEB_URL)"

backup:  ## copy data/app.db to data/backups/ (keeps the newest 20)
	@python3 scripts/backup.py

down:  ## stop and remove containers (data/ is kept)
	docker compose down

logs:  ## follow container logs
	docker compose logs -f --tail=100

dev-api:  ## run API locally with reload
	cd backend && uv run uvicorn --factory app.main:create_app --reload --port 8000

dev-web:  ## run UI locally with hot reload (proxies /api to :8000)
	cd frontend && npm run dev

test:  ## unit and API tests
	cd backend && uv run pytest -q
	cd frontend && npm test

lint:  ## linters and format check
	cd backend && uv run ruff check . && uv run ruff format --check .
	cd frontend && npm run lint && npx tsc -b

fmt:  ## auto-format
	cd backend && uv run ruff check --fix . && uv run ruff format .
	cd frontend && npm run fmt

check: lint test  ## gate before every merge to main

smoke:  ## main scenario against a running stack (make up first; stage-smoke for stage)
	docker compose exec -T api python - < scripts/smoke.py

# Permissive and weak-copyleft only; anything else (GPL, SSPL, BUSL, custom "see LICENSE") fails.
NPM_LICENSES := MIT;MIT-0;ISC;BSD-2-Clause;BSD-3-Clause;Apache-2.0;0BSD;CC0-1.0;CC-BY-4.0;BlueOak-1.0.0;Unlicense;OFL-1.1;Python-2.0;MPL-2.0

licenses:  ## fail on dependency licenses incompatible with MIT
	cd backend && uv run -q --with pip-licenses pip-licenses --from=mixed --partial-match \
		--fail-on="GPL;SSPL;Server Side Public;Business Source;BUSL;Commons Clause;Elastic License" >/dev/null
	cd frontend && npx --yes license-checker-rseidelsohn --production --excludePrivatePackages --summary \
		--onlyAllow="$(NPM_LICENSES)"
	@echo "licenses ok"

release:  ## cut today's CalVer release vYYYY.M.D from CHANGELOG.md Unreleased (DRY=1 to preview)
	scripts/release.sh $(if $(DRY),--dry-run)

clean-clone:  ## clone origin/main to a temp dir and run it by README
	scripts/clean-clone-check.sh

stage-validate:  ## validate render.yaml against Render (needs render CLI + RENDER_API_KEY)
	render blueprints validate render.yaml

stage-env:  ## push stage secrets (sync: false in render.yaml) from .env to Render, redeploy changed
	python3 scripts/stage-env.py --deploy

stage-smoke:  ## wake the free-tier API and run smoke against stage
	curl -fsS --retry 12 --retry-delay 10 --retry-all-errors $(STAGE_API_URL)/health >/dev/null
	SMOKE_API_URL=$(STAGE_API_URL) SMOKE_WEB_URL=$(STAGE_WEB_URL) python3 scripts/smoke.py

audit:  ## PageSpeed scores + what crawlers see without JS (URL=..., default stage)
	python3 scripts/audit.py $(or $(URL),$(STAGE_WEB_URL))
