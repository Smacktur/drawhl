# Data Model: Modules and the Gantt module

No table changes. Modules live in the board document (`boards.doc`).

## Board document delta

```text
Node type "module"  data {kind, title?, content}
  kind     string, ^[a-z][a-z0-9_]{0,39}$
  title    optional, ≤ 200 chars; empty shows the module's name
  content  object; validated by the kind's schema when the kind is known,
           kept as is when unknown; ≤ 256 KB as JSON
  parentId never set; a module is never a parent
```

## Gantt content (`kind = "gantt"`)

```text
{
  start: date            YYYY-MM-DD
  end: date              ≥ start, end - start ≤ 1096 days
  scale: "day" | "week" | "month" | "quarter"
  labelWidth: int        120–480, default 160: width of the task column
  rows: Row[]            ≤ 200, order = display order
  milestones: Milestone[] ≤ 100
  links: Link[]          ≤ 400
}

Row       {id, key?, title, start, end, parent?, collapsed}
            id 1–40 chars, unique in the module
            key: issue key (same rule as cards) → live task row; absent → plain row
            title ≤ 200 chars (plain rows; ignored for task rows)
            end ≥ start; dates may lie outside the range (bar is clipped)
            parent: id of a row earlier in the list; rows are in display (pre-order) order,
              so a row's parent is the row above it or one of that row's ancestors; depth ≤ 5
            collapsed: hides the row's descendants
            a row with children shows the span of its own dates and all its descendants
Milestone {id, date, title}   title ≤ 200 chars
Link      {id, from, to}      from and to are row ids in this module, from ≠ to, no duplicates
```

Defaults for a new Gantt: current calendar quarter, scale `week`, no rows, milestones or links. Size 960 × 320.

## Derived

`task_keys(doc)` = card keys ∪ keys of every known module kind (`gantt`: row keys). Used by `GET /boards/{id}` for snapshots and by refresh for polling.
