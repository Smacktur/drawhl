# 01. Strategy: OSS

**Goal**: validate the idea with a working open-source product that a stranger can install on their own machine in 10 minutes. As in MVP: one end-to-end scenario and a "yes / no / not like this" signal. The difference from MVP: the user runs the product themselves, on their own infrastructure, and judges the project by its README, releases and how issues are handled.

How it differs from the `mvp` profile:

| What | `mvp` | `oss` |
|---|---|---|
| Who runs it | us, on stage and prod | the user, self-host |
| Main path | URL on Render | `docker compose -f compose.release.yml up -d` from GHCR images |
| Legal | Privacy Policy, Terms, consents | project license, dependency license compatibility, Privacy section in the README |
| Repository | private | private until G4, public after |
| README and community file language | the team's language | English |
| Telemetry | Umami on stage | off by default; enabled only by an explicit user setting |

## 1. Research and hypothesis before code

As in `mvp`: `docs/research.md`, gate G0, then `docs/brief.md` with the user, the pain, the core scenario, the success signal, the kill criterion and Won't.

The success signal for OSS is behavior, not stars:

- first users (own team, acquaintances) installed it themselves from the README and still use it after a week;
- external: issues from strangers, repeat installs (image pulls from GHCR), PRs.

Stars are a weak signal: we count them but make no decisions based on them.

## 2. Scope: Must / Should / Won't

- **Must**: the core scenario end-to-end **plus installation**: clean machine → `docker compose up` → the scenario works. Installation is part of the product.
- **Should**: at most 1 item.
- **Won't**: everything else, explicitly. In the README, Won't becomes the Roadmap and limitations section: an open project shows its boundaries honestly.

### Deferred by default

As in `mvp` (sign-up and roles, payments, admin panel, i18n, queues, "universality"), plus:

- a plugin system and public SDK until the second real provider;
- Helm charts, k8s manifests, one-click cloud deploys, until there is a request in issues;
- a documentation site: the README and `docs/` are enough;
- a multi-tenant SaaS version.

## 3. Workflow

Walking skeleton → vertical slices, as in `mvp`. Additionally:

- **Secrets and internal data never go into git.** In a month the repository becomes public together with its entire history: do not commit tokens, internal URLs, colleagues' names or screenshots of work systems. Test data is made up.
- **External APIs go behind a port with a mock.** A contributor without access to our Jira or cloud must be able to pass `make check` and run the scenario on the mock.
- **New dependency** → its license is compatible with the project license (`make licenses`), a line in `THIRD_PARTY.md`. A proprietary SDK with a production key (example: tldraw 4+) does not go into the core.
- **User-facing changes** → a line in `CHANGELOG.md` under `Unreleased`.

## 4. Budget

As in `mvp`. Plus preparation for the public release (English README, screenshot, history check, release): 1 session in the ship phase.

## 5. Technical minimum

Everything from `mvp` (one-command compose, health, ready, metrics, JSON logs, ports with mocks, domain unit tests, smoke, secrets in ENV), plus:

- images are published to GHCR on a `v*` tag (`.github/workflows/release.yml`), `compose.release.yml` starts the product without sources;
- user data lives in a single volume (`./data`), a version update does not lose it: the DB schema migrates itself on startup;
- configuration only through ENV, all variables described in `.env.example` and the README;
- dependency license check in CI (`make licenses`);
- Dependabot for dependencies, actions and base images.

Default storage is SQLite. Postgres is an option once users ask for it.

## 6. Gates

As in `mvp`. Differences:

| Gate | What is added |
|---|---|
| **G4 Ship** | installation from images per the README on a clean machine; `make licenses` green; git history checked with gitleaks; community files filled in; after approval, the repository goes public, release `v0.1.0` with images |

Stage on Render is optional for OSS, as a public demo. The demo collects visitor data, so it needs a Privacy Policy and Terms (`/legal`); the self-hosted product itself does not.

## 7. Git and releases

- One branch per slice `feat/<slice>`, conventional commits, merge into `main` after G3.
- SemVer: `0.x` while the API and data format change; breaking changes go in the CHANGELOG under a Breaking heading.
- Release: move `Unreleased` into a version in `CHANGELOG.md` → commit → tag `vX.Y.Z` → pushing the tag builds the images and the GitHub Release.
- After publication, outside PRs go through the same CI. Only the maintainer merges.

## 8. When to parallelize

As in `mvp`: one agent by default, Orca only with ≥ 3 independent `[P]` tasks.

## 9. Definition of Done for v0.1.0

- [ ] The core scenario passes from a clean machine: from source (`docker compose up --build`) and from images (`compose.release.yml`)
- [ ] Mock mode covers the scenario without keys or access to external systems
- [ ] `make check` and `make licenses` are green, `THIRD_PARTY.md` is up to date
- [ ] English README: what and why, screenshot, quick start, configuration, Privacy, roadmap and limitations, contributing, license
- [ ] `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CHANGELOG.md` are in place and free of TODOs
- [ ] The entire git history is clean: `gitleaks git` reports nothing, no internal URLs or data
- [ ] The success signal can be measured (a counter in `/metrics`, a survey of first users)
- [ ] The repository is public, private vulnerability reporting, topics and description are set
- [ ] Tag `v0.1.0`, GitHub Release and images in GHCR
- [ ] The retro (`/retro`) is recorded in the launchpad library

## Anti-patterns

- Publishing the repository without checking its history: bots will find a secret in an old commit within minutes.
- "I'll make the OSS version later": a core built on a proprietary dependency cannot be moved afterwards.
- Polishing the site, logo and docs before anyone other than the author has installed the product.
- Building a plugin system for a single provider.
- Promising in the README what does not exist: a roadmap is a plan, not features.
