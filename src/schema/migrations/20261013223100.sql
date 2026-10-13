-- Frame: initial database migration (001)
-- Date: 26/10/13 22:31
-- SQLite. Apply once to a new database.

PRAGMA foreign_keys = ON;

BEGIN IMMEDIATE;

CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL COLLATE NOCASE UNIQUE,
  pw_hash TEXT NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0 CHECK ( is_admin IN ( 0, 1 ) ),
  created_at TEXT NOT NULL DEFAULT ( strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ) ),
  disabled_at TEXT
);

COMMIT;
