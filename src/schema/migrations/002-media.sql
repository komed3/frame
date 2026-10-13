CREATE TABLE roots (
  id INTEGER PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK ( enabled IN ( 0, 1 ) ),
  scanned_at TEXT,
  created_at TEXT NOT NULL DEFAULT ( strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ) )
);

CREATE TABLE media (
  id INTEGER PRIMARY KEY,
  root_id INTEGER NOT NULL REFERENCES roots ( id ) ON DELETE RESTRICT,
  path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK ( type IN ( 'video', 'audio', 'image', 'text', 'other' ) ),
  mime TEXT,
  size INTEGER NOT NULL DEFAULT 0 CHECK ( size >= 0 ),
  mtime_ms INTEGER,
  hash TEXT,
  available INTEGER NOT NULL DEFAULT 1 CHECK ( available IN ( 0, 1 ) ),

  title TEXT,
  description TEXT,
  rating REAL CHECK ( rating IS NULL OR rating BETWEEN 0.0 AND 1.0 ),
  released_at TEXT,
  recorded_at TEXT,
  language TEXT,

  duration_ms INTEGER CHECK ( duration_ms IS NULL OR duration_ms >= 0 ),
  width INTEGER CHECK ( width IS NULL OR width > 0 ),
  height INTEGER CHECK ( height IS NULL OR height > 0 ),
  fps REAL,
  bitrate INTEGER,
  container TEXT,
  vcodec TEXT,
  acodec TEXT,
  sample_rate INTEGER,
  channels INTEGER,
  encoding TEXT,

  data_json TEXT NOT NULL DEFAULT '{}' CHECK ( json_valid( data_json ) ),
  scanned_at TEXT,
  created_at TEXT NOT NULL DEFAULT ( strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ) ),
  updated_at TEXT NOT NULL DEFAULT ( strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ) ),

  UNIQUE ( root_id, path )
);

CREATE INDEX media_type_idx ON media ( type );
CREATE INDEX media_root_available_idx ON media ( root_id, available );
CREATE INDEX media_size_idx ON media ( size );
CREATE INDEX media_duration_idx ON media ( duration_ms );
CREATE INDEX media_rating_idx ON media ( rating );
CREATE INDEX media_released_idx ON media ( released_at );
CREATE INDEX media_hash_idx ON media ( hash );
CREATE INDEX media_title_idx ON media ( title COLLATE NOCASE );
