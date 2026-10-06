# Data Model: Modules and the Gantt module

No table changes. Modules live in the board document (`boards.doc`).

## Board document delta

```text
Node type "module"  data {kind, content}
  kind     string, ^[a-z][a-z0-9_]{0,39}$
  content  object; validated by the kind's schema when the kind is known,
           kept as is when unknown; ≤ 256 KB as JSON
  parentId never set; a module is never a parent
```

## Gantt content (`kind = "gantt"`)

```text
{
  start: date            YYYY-MM-DD
  end: date              ≥ start, end - start ≤ 1096 days
  scale: "day" | "week" | "month"
  rows: Row[]            ≤ 200, order = display order
  milestones: Milestone[] ≤ 100
  links: Link[]          ≤ 400
}

Row       {id, key?, title, start, end}
            id 1–40 chars, unique in the module
            key: issue key (same rule as cards) → live task row; absent → plain row
            title ≤ 200 chars (plain rows; ignored for task rows)
            end ≥ start; dates may lie outside the range (bar is clipped)
Milestone {id, date, title}   title ≤ 200 chars
Link      {id, from, to}      from and to are row ids in this module, from ≠ to, no duplicates
```

Defaults for a new Gantt: current calendar quarter, scale `week`, no rows, milestones or links. Size 960 × 320.

## Derived

`task_keys(doc)` = card keys ∪ keys of every known module kind (`gantt`: row keys). Used by `GET /boards/{id}` for snapshots and by refresh for polling.
