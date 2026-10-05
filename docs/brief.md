# Brief: drawhl

> Open-source infinite canvas with live Jira Data Center task cards for leads who think spatially

Filled in during Intake and Scope (gate **G1**) from [research.md](research.md). Structure: [docs/playbook/01-strategy.md](playbook/01-strategy.md).

## Hypothesis

The main hypothesis from the research (top by ICE): a lead will trust the canvas and manage their tasks on it only if card statuses update on their own. A spatially minded lead will open drawhl every day because lists and kanban boards don't give them an overview of their tasks. We'll know by how often they open it and by manual refresh being almost unnecessary.

| Field | Answer |
|---|---|
| User | A lead, head or manager on Jira Data Center who keeps track of their own tasks and thinks spatially |
| Pain | Lists and kanban boards give no overview; tasks can't be "touched" and grouped. In boards with Jira (Miro) the status goes stale, cards get recreated by hand, and DC needs OAuth through an admin |
| Success signal | The founder and ≥ 3 leads from the team open the board ≥ 4 days a week for two weeks in a row. Status lags Jira by ≤ 1 min. Self-rated "organization" and "keeping up" scores went up compared with the survey before the start |
| Kill criterion | After 2 weeks even the founder is back to Jira filters, or polling DC through a PAT can't deliver fresh statuses without a load that admins complain about |
| Channel: how the first 100 users hear about it | The first 10–20: own team and neighboring departments. Then the OSS community: GitHub, Show HN, r/jira, r/selfhosted, Habr. The founder has no audience, which is a distribution risk |

## Core scenario

1. The user starts drawhl (`docker compose up`), opens it in the browser and enters the Jira DC URL and their PAT in settings.
2. Creates a board, draws frames and sticky notes, connects them with arrows.
3. Adds a task with the "Jira card" tool by key (`SRE-121`) or by pasting a link. A compact card appears on the canvas: type icon, key, title, status.
4. Drags cards into frames, collapses them to the key, and clicks to expand a mini-card (assignee, priority, updated, link to Jira).
5. Changes the task status in Jira. Within ≤ 1 min the card on the board shows the new status. A closed task is struck through. The board is saved and reopens looking the same.

## Scope

**Must**
- Core scenario end-to-end
- xyflow canvas: pan, zoom, frames (groups), sticky notes and text, arrows with binding, selection and dragging
- Jira DC card: add by key or URL, collapsed and expanded states, mini-card on click
- Automatic status updates: batched JQL polling every 30–60 s for the cards on the open board, a "Refresh all" button, an "updated N s ago" indicator
- Provider behind an interface (`resolve`, `poll`), only Jira DC implemented
- The PAT is stored only on the backend, encrypted, and never reaches the browser
- Boards are saved on the backend (SQLite), multiple boards
- Self-host: `docker compose up`, README with setup in ≤ 10 min

**Should** (at most 1)
- Pasting a JQL query: tasks are laid out on the canvas in a batch

**Won't**
- Real-time collaborative editing, board sharing
- Jira Cloud, Confluence, Todoist (only a hook in the provider interface)
- Two-way sync: changing status and editing a task from the board
- Jira webhooks
- Freehand drawing and arbitrary shapes other than sticky note and frame
- Auth, roles, multi-user (one user per instance), payments, admin panel
- i18n: English-only interface
- LLM
- Mobile version

## Stack

- Backend: FastAPI
- Frontend: React/TS + `@xyflow/react`
- Profile: `oss`, MIT license, self-host (`compose.release.yml`)
- LLM: none

## Risks

| Risk | Plan B |
|---|---|
| xyflow can't deliver whiteboard UX (frames, sticky notes, selection) and feels like a graph editor | Prototype the canvas as the first slice. If it doesn't feel right, build a Plait (Drawnix) prototype in a day and decide before the second slice |
| DOM rendering slows down on 200+ cards | Collapsed cards by default, `onlyRenderVisibleElements`, benchmark on a 300-node board |
| DC admins object to frequent polling, or there is a rate limit | One batched JQL per board, `updated >= -2m`, poll only the open board, interval configurable in settings |
| Demand for a personal tool isn't confirmed beyond the founder | Validate with the team before going to the community. Kill criterion above |
| The PAT leaks through logs or the bundle | Encryption on disk, key from env, masking in logs, a test that the API never returns the token |
