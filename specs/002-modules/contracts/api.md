# API contract delta: Modules

Base contract: [001 contracts/api.md](../../001-live-jira-canvas/contracts/api.md). No new endpoints.

## `PUT /api/boards/{id}` and `GET /api/boards/{id}`

`doc.nodes[]` accepts a new node type:

```json
{
  "id": "n7",
  "type": "module",
  "position": { "x": 120, "y": 80 },
  "width": 960,
  "height": 320,
  "data": {
    "kind": "gantt",
    "title": "Q4 plan",
    "content": {
      "start": "2026-10-01",
      "end": "2026-12-31",
      "scale": "week",
      "labelWidth": 160,
      "rows": [
        { "id": "r1", "key": "DEMO-3", "title": "", "start": "2026-10-06", "end": "2026-10-17" },
        { "id": "r2", "title": "Design review", "start": "2026-10-20", "end": "2026-10-22" }
      ],
      "milestones": [{ "id": "m1", "date": "2026-11-01", "title": "Beta" }],
      "links": [{ "id": "l1", "from": "r1", "to": "r2" }]
    }
  }
}
```

Errors, all `422`. Schema errors come as `invalid_request` with the field and reason in `message`, like other doc fields:

- `kind` not matching `^[a-z][a-z0-9_]{0,39}$`
- content over 256 KB
- known kind with invalid content, e.g. `gantt: end before start`, `gantt: range over 3 years`, `gantt: duplicate row id r1`, `gantt: link l1 points at a missing row`, invalid issue key

Structure errors come as `validation_failed`:

- `parentId` on a module, or a node whose `parentId` points at a module

Unknown kinds are accepted and returned unchanged.

`GET` returns `tasks` for every card key and every task key inside known modules.

## `POST /api/boards/{id}/refresh`

Unchanged shape; polled keys now include task keys inside modules.
