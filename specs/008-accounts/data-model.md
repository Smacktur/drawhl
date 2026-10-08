# Data Model: Accounts and roles

SQLite, new migrations from `004_accounts.sql` on (one per slice: `004_accounts`, `005_invites`, `006_members`, `007_credentials`). Ids are 32-char hex like boards. Times are ISO 8601 UTC text, as in the existing tables.

```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,          -- scrypt$n$r$p$salt_b64$hash_b64
    role TEXT NOT NULL,                   -- admin | member
    disabled_at TEXT,
    last_sign_in_at TEXT,
    created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX users_username ON users (lower(username));

CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,          -- sha256 hex of the cookie value
    user_id TEXT NOT NULL REFERENCES users(id),
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX sessions_user ON sessions (user_id);

CREATE TABLE invites (
    token_hash TEXT PRIMARY KEY,
    kind TEXT NOT NULL,                   -- invite | reset
    role TEXT,                            -- invite: admin | member
    user_id TEXT REFERENCES users(id),    -- reset: whose password
    created_by TEXT NOT NULL REFERENCES users(id),
    expires_at TEXT NOT NULL,
    used_at TEXT,
    revoked_at TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE board_members (
    board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    role TEXT NOT NULL,                   -- owner | editor | viewer
    PRIMARY KEY (board_id, user_id)
);
CREATE INDEX board_members_user ON board_members (user_id);
ALTER TABLE boards ADD COLUMN everyone_role TEXT;   -- NULL | viewer | editor

CREATE TABLE user_credentials (
    user_id TEXT NOT NULL REFERENCES users(id),
    provider TEXT NOT NULL,               -- jira
    token_enc TEXT NOT NULL,              -- Fernet, DRAWHL_SECRET_KEY
    base_url TEXT NOT NULL,               -- instance URL the token was tested against
    PRIMARY KEY (user_id, provider)
);

-- Snapshots become per person: one token's view never reaches another person.
CREATE TABLE task_snapshots_v2 (
    user_id TEXT NOT NULL,                -- '' for the demo provider, shared by everyone
    key TEXT NOT NULL,
    state TEXT NOT NULL,                  -- ok | not_found | forbidden
    data TEXT NOT NULL,
    fetched_at TEXT NOT NULL,
    PRIMARY KEY (user_id, key)
);
```

Upgrade, done in code on first start after the migration (the admin's password is not known to SQL):

1. No row in `users` → create `admin` with role `admin` and the password from `DRAWHL_PASSWORD` or `data/password` (generate and log once if neither, as in spec 007).
2. Every board without an owner gets `admin` as owner.
3. The instance tracker token in `settings` (`jira.token`) moves to `user_credentials` for `admin`; the setting is deleted. `jira.base_url`, `provider`, `refresh_interval_s` stay in `settings` as instance settings.
4. Rows of `task_snapshots` are copied to `task_snapshots_v2` with `admin`'s id (demo keys with `''`), then `task_snapshots` is dropped.
5. `welcome_seeded` moves to a per-user marker (`users` row or a `user_settings` key), so each new person gets their own welcome board once.

Roles in one place (`domain/access.py` or a new `domain/members.py`):

```text
effective_role(person, board) = max(board_members.role for person, boards.everyone_role, "owner" if person is admin)
order: none < viewer < editor < owner
```
