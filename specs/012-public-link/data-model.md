# Data Model: Public link

Migration `009_public.sql`:

```sql
ALTER TABLE boards ADD COLUMN public_token TEXT;   -- NULL while the board is not public
CREATE UNIQUE INDEX boards_public_token ON boards (public_token) WHERE public_token IS NOT NULL;
```

- The token is 24 random bytes as URL-safe base64 (32 characters, 192 bits).
- It is stored as it is, not hashed: the owner must be able to read the link again, and the token gives read access to one board only.
- A board that is deleted takes its token with it.
- After the migration no board is public.

Settings table: key `public_links`, `"0"` when an admin switched public links off; absent or `"1"` means allowed. Switching it off keeps the tokens: the links answer `not_found` while it is off and work again when it is back on.

Nothing is stored about guests.
