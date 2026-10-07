# API contract change: timer nodes

`PUT /api/boards/{id}` and `GET /api/boards/{id}`: `doc.nodes[]` accepts a new node type.

```json
{
  "id": "t1",
  "type": "timer",
  "position": { "x": 264, "y": 0 },
  "width": 40,
  "height": 40,
  "parentId": "card-1",
  "data": {
    "note": "ping QA",
    "dueAt": "2026-10-25T12:00:00.000Z",
    "snoozedUntil": "2026-10-25T12:10:00.000Z",
    "repeat": "daily",
    "watch": { "key": "DEMO-1", "status": "In Review" },
    "done": false
  }
}
```

- `data.note`: string, up to 500 characters, default `""`.
- `data.dueAt`: ISO 8601 moment or `null` (a status timer that has not gone off).
- `data.snoozedUntil`, `data.repeat` (`daily`, `weekdays`, `weekly`), `data.watch`, `data.done`: optional.
- `parentId` of a timer may point at any earlier node except an anchor or another timer; other nodes still nest only in frames.
- No other endpoint changes.
