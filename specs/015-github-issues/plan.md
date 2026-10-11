# Implementation Plan: GitHub Issues

**Spec**: [spec.md](spec.md) | **Contract**: [contracts/api.md](contracts/api.md)

## Summary

One adapter, `adapters/tasks/github.py`, reads issues and pull requests over the GitHub REST API. `deps.providers` adds it to every request next to the demo source. `resolve` picks the source by the shape of what was typed. Reads without a personal token go through one reader shared by the instance, which asks each repository for what changed since its last poll and paces itself by the limit GitHub reports. The web app gets a registry entry, a mark per theme and a wider link pattern. Slice 2 adds labels and rows to the task and the mini-card, slice 3 a personal token.

## Facts checked against the GitHub REST docs (2026-10-11)

- Without a token: 60 requests an hour per address, public data only.
- A conditional request answered `304` does not count against the limit only when it carries an `Authorization` header. So ETags help with a token and do not help without one.
- `GET /repos/{owner}/{repo}/issues` takes `state=all`, `since` (ISO 8601) and `per_page` up to 100, and returns pull requests too. A live answer for `tiko-run/tiko` without a token confirmed `pull_request.merged_at`, `draft` and `state_reason` in that list (T001).
- GraphQL needs a token for every request, so it cannot serve the no-key case; REST serves both.

## Structure

```text
backend/app/adapters/tasks/github.py   GitHubProvider (per token), SharedGitHub (the reader without a personal token)
backend/app/domain/tasks.py            key patterns per source, GitHub link and key parsing, Task.labels and Task.rows
backend/app/domain/errors.py           TrackerUnavailable, TrackerRateLimited, TrackerUnreachable as bases of the Jira errors
backend/app/domain/refresh.py          backoff on the tracker bases; a note per source ("updates every few minutes")
backend/app/domain/boards.py, modules/gantt.py   key validated by the source of the card, row or watch
backend/app/domain/settings.py         slice 3: a GitHub token per person
backend/app/api/deps.py                providers(): demo, github, and Jira when the instance is set to it
backend/app/api/tasks.py               resolve routes by shape
backend/app/config.py                  github_token
frontend/src/sources/registry.ts       github: name, mark, markDark; marks/github.svg, github-dark.svg
frontend/src/canvas/refs.ts            GitHub links and keys next to Jira ones
frontend/src/canvas/nodes/             TaskBits (type icons, short key), CardDetails (chips, rows)
frontend/src/settings/sections/        slice 3: the GitHub token in My tracker
scripts/smoke.py                       a GitHub card against the mock
```

## Decisions

- **REST only, one code path.** A poll asks each repository of the board `issues?state=all&since=<last poll>`: one request per repository whatever the number of cards. The first sight of a task is `GET /repos/{owner}/{repo}/issues/{number}`.
- **The shared reader is one object in `app.state`.** It keeps, per repository, the last poll time and the tasks seen, and serves every person and guest without a personal token from that memory. Public data has no owner, so sharing it leaks nothing. A repository nobody asked about for an hour is dropped.
- **The pace is a budget spread in turn.** Every refresh of a board calls `poll`; the reader answers from memory and asks GitHub only for repositories that are due. A repository is due after `max(board interval, repositories × turn cost × 3600 / budget)` seconds (a turn costs one request, two with a token: the visibility check and the list; extra reads of single tasks push that repository's next turn back by their share), where the budget is the hourly limit GitHub reports in `x-ratelimit-limit` less a fifth kept for adding cards. Due repositories are taken the longest-waiting first, and only repositories some board asked about in the last hour count. Without a token that is 48 polls an hour: one repository every 75 s, five every 6 min. With a token the interval is the board's own up to about 30 repositories and grows past that; answers of `304` cost nothing there, so real instances stay well inside. The reader also obeys `x-ratelimit-remaining` and `x-ratelimit-reset` and raises `TrackerRateLimited` with the wait before it would run dry. Nothing is stored about the pace: a token added later changes the reported limit and the same rule speeds up.
- **A cap of 500 tracked repositories** on the shared reader bounds its memory and one script's reach; over it a new repository is refused with a plain message.
- **The server token is checked against private repositories before every read.** The reader asks `GET /repos/{owner}/{repo}` with an ETag ahead of each turn and each new card; `private: true` is answered as not found and the repository's tasks are dropped from memory, so a repository made private stops being served at once.
- **A task the list does not reach is read again every 6 hours**, since a deleted issue changes nothing in the list.
- **Idle repositories are forgotten on every poll**, so boards that were closed do not slow the rest.
- **Keys are validated by source.** `github` takes `owner/repo#number`; every other source keeps the Jira pattern. A card without a source is the instance's tracker, as in spec 013. The key keeps the case GitHub answers with; lookups compare owner and repository without case.
- **The type rides in `type_name`** ("Issue", "Pull request"), which already picks the icon; no new field for the kind.
- **Tracker errors get neutral bases.** `JiraUnavailable`, `JiraRateLimited` and `JiraUnreachable` keep their names and codes and inherit from the new bases; the refresh checks the bases. Renaming the Jira classes is not part of this spec.
- **GitHub has no `search`.** The provider raises a validation error with a plain sentence; the card tool does not offer a query for GitHub.
- **Labels and rows ship with their producer** (slice 2): `Task.labels: [{name, color}]`, `Task.rows: [{label, value}]`. Old cached tasks read as empty lists; no migration.
- **A chip is drawn from the label's color with a fixed readable text color per theme**, like GitHub's own label rendering, not from theme tokens: an accepted exception recorded in `DESIGN.md`.
- **The personal token reuses `CredentialRepo`** under the kind `github`, bound to `https://api.github.com`. The provider takes a token and does not care where it came from, so a later sign-in with GitHub writes the same record. A person with a token gets their own `GitHubProvider`; their cache is their own, as for Jira. Without one they get the shared reader, and a task it cannot read while the board names it comes back as `no_token`.
- **The mark**: GitHub's official Invertocat SVG in black and in white from the GitHub brand toolkit, two files, never recolored with CSS. `SourceMark` picks by theme.

## Slices

| Branch | Story | Done when |
|---|---|---|
| `feat/github-issues` | US1 | on a compose stack with a mock GitHub and no token, a pasted issue link and a pull request link are live cards with statuses from state and labels; the sync list has a GitHub row; a guest sees them in full; a used-up limit leaves the other sources working; `make smoke` covers a GitHub card |
| `feat/github-labels` | US2 | the mini-card of a labelled issue shows chips and the Author row in both themes; a Jira mini-card matches the old screenshot |
| `feat/github-token` | US3 | with a mock private repository: the token's owner sees the task, a person without a token sees the key and the hint, a guest sees the key; the byte test passes |

## Risks

| Risk | Answer |
|---|---|
| The limit without a token runs out on a busy instance | one request per repository, a pace that grows with the number of repositories, a clear row in the sync list, `GITHUB_TOKEN` in the guide as the fix |
| A demo visitor adds cards from hundreds of repositories | the budget is spread in turn, so the others slow down and nothing fails; a cap of 500 repositories |
| The server token leaks a private repository to everyone | the `private` check before anything is served; a test with a mock private repository |
| The `issues` list lacks a field the status needs | verified on a live answer in the first task; the fallback is one `pulls/{number}` request for an open pull request |
| Key validation by source breaks stored boards | a document without a source validates exactly as before; a test on a stored board of spec 013 |
| GitHub objects to the mark | the official file, unchanged, black or white only, listed in `THIRD_PARTY.md`; one registry entry to remove |
