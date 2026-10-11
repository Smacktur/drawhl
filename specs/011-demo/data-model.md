# Data Model: Demo accounts

Migration `010_demo.sql`:

```sql
ALTER TABLE users ADD COLUMN demo_expires_at TEXT;   -- NULL for everyone but a demo visitor
CREATE INDEX users_demo ON users (demo_expires_at) WHERE demo_expires_at IS NOT NULL;

CREATE TABLE demo_statuses (
    user_id TEXT NOT NULL REFERENCES users(id),
    key TEXT NOT NULL,
    status TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (user_id, key)
);
```

## Demo visitor

A row in `users`:

| Column | Value |
|---|---|
| `username` | `~` and 12 random hex characters; `~` is outside the username rule, so nobody can pick or type it |
| `name` | `Demo visitor` |
| `password_hash` | `!`, which no password matches |
| `role` | `member` |
| `demo_expires_at` | 7 days after the last request, moved at most once a minute. The cleanup takes a visitor who changed nothing when under 6 days 23 hours of it are left, which is an hour after their last request |

- After the migration nobody is a demo visitor.
- Sign-up writes the chosen `username`, `name` and `password_hash` and sets `demo_expires_at` to NULL in one statement that matches only a row that still has an expiry.
- The session row is the usual one, 30 days. It stops working when the visitor expires.

## Cleanup

For every `users` row with `demo_expires_at` in the past, in one transaction:

| Table | What goes |
|---|---|
| `boards` | boards where the visitor is the owner, with their live state and public token |
| `board_members` | every row of those boards and every row of the visitor |
| `sessions` | the visitor's |
| `user_credentials` | the visitor's (none are expected on a demo instance) |
| `task_snapshots_v2` | the visitor's cache |
| `demo_statuses` | the visitor's |
| `invites` | rows that name the visitor (none are expected) |
| `users` | the row |

A demo visitor cannot share, so a board they own never has another member.

The same cleanup deletes, in the same way, everyone but admins whose `last_sign_in_at` (or `created_at`, when they never signed in) is more than 90 days old. Sign-up sets `last_sign_in_at`. A session lasts 30 days, so anyone who uses their account signs in well inside the 90.

## Demo task statuses

`demo_statuses` holds only what a person changed: one row per changed task. A task with no row has its built-in status. Used on a demo instance only; on an ordinary instance the demo provider keeps its one shared set in memory, as before.

Rows of a signed-up person stay with them. Size: a row is under 100 bytes; the snapshot cache is about 1 KB per task per person, so 10,000 people with 30 tasks each come to about 30 MB of SQLite.

## Limits

Constants in `domain/demo.py`, no settings and no ENV:

| Limit | Value | Counted from |
|---|---|---|
| Demo visitors per client address (an IPv6 /64 counts as one) | 5 an hour | memory, per process |
| Demo visitors alive | 500; a new one evicts the longest idle visitor who changed nothing | `users` rows with an expiry in the future |
| Boards owned by one person who is not an admin | 3 | `board_members` rows with role `owner` |
