CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  pass_hash TEXT NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0 CHECK ( is_admin IN ( 0, 1 ) ),
  created_at TEXT NOT NULL DEFAULT ( strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ) ),
  disabled_at TEXT
);

CREATE TABLE sessions (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users ( id ) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT ( strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ) ),
  expires_at TEXT NOT NULL,
  seen_at TEXT,
  ip TEXT,
  agent TEXT
);

CREATE INDEX sessions_user_idx ON sessions ( user_id );
CREATE INDEX sessions_expiry_idx ON sessions ( expires_at );

CREATE TABLE prefs (
  user_id INTEGER NOT NULL REFERENCES users ( id ) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value_json TEXT NOT NULL CHECK ( json_valid( value_json ) ),
  updated_at TEXT NOT NULL DEFAULT ( strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ) ),
  PRIMARY KEY ( user_id, key )
);
