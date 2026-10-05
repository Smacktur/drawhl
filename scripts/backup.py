"""Copy data/app.db to data/backups/app-<timestamp>.db and keep the newest few.
Stdlib only, runs on the host; safe while the stack is up (SQLite online backup)."""

import sqlite3
import sys
from datetime import datetime
from pathlib import Path

DB = Path("data/app.db")
BACKUPS = Path("data/backups")
KEEP = 20


def main() -> None:
    if not DB.exists():
        print(f"backup: {DB} not found, nothing to back up")
        return
    BACKUPS.mkdir(parents=True, exist_ok=True)
    target = BACKUPS / f"app-{datetime.now():%Y%m%d-%H%M%S}.db"
    source = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)
    dest = sqlite3.connect(target)
    with dest:
        source.backup(dest)
    # The copy inherits WAL mode; a single self-contained file is easier to restore.
    dest.execute("PRAGMA journal_mode=DELETE")
    source.close()
    dest.close()
    for old in sorted(BACKUPS.glob("app-*.db"))[:-KEEP]:
        old.unlink()
    print(f"backup: {target}")


if __name__ == "__main__":
    sys.exit(main())
