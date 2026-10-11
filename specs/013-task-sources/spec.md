# Feature Specification: Task sources

**Feature Branch**: `013-task-sources`

**Created**: 2026-10-11

**Status**: Approved at G2 on 2026-10-11.

**Input**: Owner's decision at G1 on 2026-10-11: "tiko will have many trackers at once, on one board and on one instance." Tasks from different trackers must be told apart at a glance: a logo next to the task, shown once a board mixes trackers. A GitHub Issues provider follows this spec. Settings, the add-card flow and the Gantt add form for several trackers come later.

## Why

Today an instance reads one tracker, and nothing in a task, a card or the cache says where a task comes from. A second tracker cannot be added without two keys colliding, and a board that mixes trackers would not show which task lives where. This spec gives every task a source and shows it, so the next tracker is an adapter and not a rewrite.

## Terms

- **Source**: a tracker tiko reads tasks from: `jira`, `demo`, later `github` and others. It has an id, a name and a mark.
- **Mark**: the small logo of a source.
- **Ref**: what identifies a task: its source and its key, written `source:key`, like `jira:ABC-12`.
- **Mixed board**: a board with tasks from two or more sources.

## Decisions

1. **A task is identified by its ref.** Two sources may use the same key; the ref keeps them apart in the board answer, the cache and the refresh.
2. **One card for every source.** The card keeps one shape: mark, type icon, key, title, status. A source maps its own data onto this core: `kind`, status name and one of three status categories, assignee, updated, link. No card component per tracker.
3. **What only one tracker has goes into two shared places** in the mini-card: extra rows (label and value) and chips (labels, tags). They are built with the first source that has such data, GitHub Issues, not in this spec.
4. **The mark shows on a mixed board only.** A board with one source stays as quiet as today. The mini-card and the sync list always show the mark and the name.
5. **Logos, not colored borders.** A card's border already means "selected" and "selected by someone else", so it carries no brand color. The mark is the official logo of the tracker, unchanged, in a color its owner allows.
6. **Sources work side by side.** A refresh polls each source of the board once and reports each on its own. One failing source does not stop the others.
7. **Demo tasks are the first second source.** On an instance connected to Jira the welcome board's demo tasks stay live instead of turning into "Not found". This makes a mixed board possible before any new tracker is written.
8. **Old boards are not rewritten.** A card saved without a source belongs to the tracker the instance is set to, as it does today.
9. **Words come from the source.** "Open in Jira" and "Connect your Jira token" take the name from the task's source.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tasks of two sources live on one board (Priority: P1) 🎯

An admin connects Jira on a fresh instance. The welcome board still shows its demo tasks with titles and statuses. A person adds Jira cards next to them. Both kinds refresh on schedule. The sync indicator lists "Jira Data Center" and "Demo tasks" in two rows. Jira goes down: its row turns red, Jira cards keep their last data, demo cards keep refreshing.

**Why this priority**: Without a source in the task nothing else can be built, and a mixed board is the only way to check it.

**Independent Test**: on an instance set to Jira with a mock Jira, open a new person's welcome board: demo cards show full data. Add a Jira card with key `DEMO-1` from the mock: both `DEMO-1` cards sit on the board with their own titles. Stop the mock: the sync list shows Jira failing and demo synced.

**Acceptance Scenarios**:

1. **Given** an instance set to Jira, **When** a person's welcome board is created, **Then** its cards and Gantt rows carry the source `demo` and show full data.
2. **Given** a board with tasks of two sources, **When** it refreshes, **Then** each source is polled once and the answer lists a status per source.
3. **Given** two tasks with the same key in different sources, **Then** each card shows its own task.
4. **Given** a board saved before this version, **Then** it opens and refreshes as before, with no change to its document.
5. **Given** a guest on a public board, **Then** demo tasks show in full and tasks read with a person's token show the key only, whatever the instance is set to.
6. **Given** a card of a source the person has no token for, **Then** the text names that source: "Connect your Jira token to see this task".

### User Story 2 - See where a task comes from (Priority: P2)

A person looks at a mixed board. Every card starts with a small mark: the Jira logo on Jira cards, the tiko emblem on demo cards. They open a card: the mini-card ends with "Open in Jira". On a board with Jira tasks only, the cards look exactly as before.

**Why this priority**: This is what the owner asked for; it needs story 1.

**Independent Test**: screenshots of a mixed board and of a one-source board in both themes; the one-source board matches the screenshot from before this spec.

**Acceptance Scenarios**:

1. **Given** a mixed board, **Then** every card, expanded or collapsed, starts with the 14px mark of its source, before the type icon.
2. **Given** a board with one source, **Then** no card shows a mark.
3. **Given** the last task of a second source is removed, **Then** the marks go away without a reload; adding one brings them back.
4. **Given** a mini-card, **Then** its link button reads "Open in <source name>" with the mark.
5. **Given** the sync list, **Then** each row starts with the source's mark.
6. **Given** a Gantt on a mixed board, **Then** task rows show the mark before the type icon.
7. **Given** the dark theme, **Then** every mark is readable against the card.

### Edge Cases

- A Jira project is really called `DEMO`: a typed key `DEMO-1` goes to Jira, as today. Demo tasks reach a Jira instance through the welcome board and by copying its cards.
- A card of a source this version does not know (a board from a newer tiko): the key and "Unknown tracker", no error.
- A copied card keeps its source when pasted on another board.
- A status timer watches a task by its ref and keeps working on a mixed board.
- Search filters (`status:`, `type:`) work across sources.
- Upgrading: each person's task cache is carried over under the tracker the instance is set to, so cards keep their data even while the tracker cannot be reached.

## Requirements *(mandatory)*

- **FR-001**: `Task` gains `source`. Every provider sets it.
- **FR-002**: Cards, Gantt task rows and timer watches may carry `source`. Without it the task belongs to the tracker the instance is set to.
- **FR-003**: The `tasks` maps in the board, refresh and public answers are keyed by ref.
- **FR-004**: The task cache is keyed by person, source and key.
- **FR-005**: A refresh groups the board's refs by source, polls each source once and keeps backoff and errors per source and person.
- **FR-006**: The demo source is always available and needs no token.
- **FR-007**: The welcome board is written with `source: "demo"`.
- **FR-008**: A guest route decides what to show by the task's source, not by the instance setting.
- **FR-009**: The web app has one registry of sources: id, name, mark for the light and the dark theme. Card texts take the name from it.
- **FR-010**: Marks are official files taken from the tracker's own brand pages, unchanged, listed in `THIRD_PARTY.md` with their terms. `TRADEMARKS.md` says these marks belong to their owners.
- **FR-011**: `DESIGN.md` replaces the ban on tracker logos with the rule of this spec: where a mark may appear, its size, no brand color anywhere else.
- **FR-012**: The contract change is written in `specs/013-task-sources/contracts/` before the code.
- **FR-013**: No new dependency, no external service, no new ENV variable; works without keys.
- **FR-014**: `docs/brief.md` moves "several trackers at once" out of Won't. The guide and `CHANGELOG.md` get a line each.

## Success Criteria *(mandatory)*

- **SC-001**: A board saved by the previous release opens with every card resolved after one refresh, and its stored document is byte-identical.
- **SC-002**: Two tasks with one key from two sources show two different titles on one board.
- **SC-003**: With one source failing, the other source's tasks still refresh on schedule.
- **SC-004**: A one-source board renders pixel-identical to the previous release in both themes.
- **SC-005**: A new source needs one adapter, one registry entry and one mark file; no change to the card.

## Slices

1. `feat/task-sources` (US1): the source in tasks, refs, cache and refresh; demo tasks next to Jira; texts from the source.
2. `feat/source-mark` (US2): the registry with marks, the mark on cards, the mini-card, the sync list and Gantt rows.

## Out of scope

- A GitHub Issues provider, with pull requests, labels and a status taken from labels: the next spec.
- Extra rows and chips in the mini-card (decision 3).
- Renaming the stored node type `jira_card`.
- Brand colors on cards.

### Still tied to one tracker after this spec

Every place below works with the instance's single tracker and speaks Jira. Each one must be widened when a second real tracker arrives, so none of them is forgotten:

- **Settings.** Task source holds one tracker for the instance, My tracker one token per person. Several trackers need a list of connections and a token per tracker.
- **Adding a card** (the `C` tool and its popover): one input for Jira keys, links and JQL, with JQL suggestions and a match count. It needs a choice of tracker, each tracker's own key and link shapes and its own query language.
- **The context menu**: "Add Jira card" on an empty spot. It needs one entry per connected tracker or one entry that asks which.
- **The Gantt add form**: its tracker tab is named after the instance's tracker and reuses the card input.
- **Paste**: only Jira keys and `/browse/KEY` links turn into cards. Links of other trackers must be recognized by their host and shape.
- **Search**: the filters `status:`, `type:`, `priority:` and `@` assume Jira's fields; a tracker without priorities or types gives nothing to filter by. There is no filter by source (`source:` or `in:`), and a result row does not show the mark.
- **Commands** (the palette and its keywords): "Jira card" as a tool name, "jira token" as a search keyword for Settings. Commands to add a card of a given tracker and to open a tracker's settings are missing.
- **Shortcuts list**: the `C` tool is labelled "Jira card".
- **Timers**: a status timer reads the statuses of one tracker; its editor's wording assumes a Jira card.
- **Copy outside the card**: the empty state ("Create a board to start placing Jira tasks on it."), the delete dialog ("Tasks stay in Jira."), error texts that name Jira.
- **The API**: `resolve` and `search` send a bare key or a query to the instance's tracker; the JQL vocabulary routes exist for Jira only; domain errors are named after Jira (`JiraUnavailable`, `JiraRateLimited`) and drive the refresh backoff.

## Answers from the owner (2026-10-11)

1. Marks ship in their official colors, unchanged: the Jira mark in blue, the GitHub mark later in black on light and white on dark. An accepted exception to "color only on statuses".
2. The Jira mark ships on these terms: the official file, unchanged, small, listed in `THIRD_PARTY.md`.
3. The task cache may be rebuilt on upgrade. Built better than agreed: the first check on a real instance had Jira unreachable, and a rebuilt cache would have left every card empty, so migration 011 carries each person's rows over.
4. Several trackers work at once on one instance and one board. Settings, the add-card flow, the Gantt form, search, commands and the context menu are widened later, with the list above as the checklist.
