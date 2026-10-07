# Contributing to drawhl

Thanks for taking the time to help. Bug reports, ideas, docs fixes and code are all welcome.

## Before you start

- **Bugs and ideas** — open an issue using a template. Search existing issues first.
- **Security issues** — never in public issues; see [SECURITY.md](SECURITY.md).
- **Larger changes** — open an issue or discussion before writing code, so we agree on the approach and you don't lose work.
- Issues labelled `good first issue` are a good starting point.

## Development setup

Requirements: Docker, Python 3.12+ and [uv](https://docs.astral.sh/uv/), Node 22+.

```bash
git clone <your fork>
cd drawhl
make up           # whole stack in Docker
make dev-api      # API with hot reload on :8000
make dev-web      # UI with hot reload on :3000
make check        # lint + tests, the gate CI runs
make help         # all commands
```

Optional: `pre-commit install` runs fast checks on commit and `make check` on push.

## Pull requests

1. Branch from `main`, keep the change focused on one thing.
2. Add or update tests for behaviour changes; `make check` must pass.
3. Use [Conventional Commits](https://www.conventionalcommits.org/): `feat: …`, `fix: …`, `docs: …`.
4. Update `CHANGELOG.md` under `Unreleased` for user-visible changes, and the user guide in `docs/guide/` when the change alters how something is used; it publishes to [smacktur.github.io/drawhl](https://smacktur.github.io/drawhl/) on merge. Preview it with `npm run dev` in `docs/guide/`; pages live in `docs/guide/src/content/docs/`.
5. New dependency → a row in `THIRD_PARTY.md`; its license must be permissive or weak copyleft (`make licenses`); GPL-family licenses are not accepted, they would block dual licensing.
6. Fill in the PR template. A maintainer reviews; CI must be green before merge.

Code style follows [docs/playbook/04-coding-standards.md](docs/playbook/04-coding-standards.md); formatters and linters (`make fmt`) settle the rest.

## AI-assisted contributions

Using AI tools is fine. You are responsible for every line you submit: understand it, test it, and say in the PR description if a substantial part was generated.

## License

drawhl is licensed under the [GNU AGPL v3](LICENSE). On your first pull request, the CLA Assistant bot asks you to sign the [Contributor License Agreement](CLA.md): one click with your GitHub account, and it covers your future pull requests too. You keep the copyright in your work; the CLA lets the maintainer also offer drawhl under other terms, such as a hosted version, while the code stays open under the AGPL. Everyone taking part follows the [Code of Conduct](CODE_OF_CONDUCT.md).
