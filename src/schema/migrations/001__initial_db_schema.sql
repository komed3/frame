-- Frame: Migration 001 – Initial schema
-- Database: SQLite
-- Apply once to a new, empty database.


PRAGMA foreign_keys = ON;

BEGIN IMMEDIATE;


-- ============================================================
-- 1. Users and authentication
-- ============================================================

CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL COLLATE NOCASE UNIQUE,
  pw_hash TEXT NOT NULL,
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
  last_seen_at TEXT
);

CREATE INDEX sessions_user_idx ON sessions ( user_id );
CREATE INDEX sessions_expiry_idx ON sessions ( expires_at );


-- ============================================================
-- 2. Media roots and media files
-- ============================================================

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

  -- General file information
  type TEXT NOT NULL CHECK ( type IN ( 'video', 'audio', 'image', 'text', 'other' ) ),
  mime_type TEXT,
  size_bytes INTEGER NOT NULL DEFAULT 0 CHECK ( size_bytes >= 0 ),
  modified_at TEXT,
  file_hash TEXT,
  available INTEGER NOT NULL DEFAULT 1 CHECK ( available IN ( 0, 1 ) ),

  -- Human-readable metadata
  title TEXT,
  description TEXT,
  creator TEXT,
  rating REAL CHECK ( rating IS NULL OR rating BETWEEN 0.0 AND 1.0 ),
  released_at TEXT,
  recorded_at TEXT,
  language TEXT,

  -- Common technical properties
  duration_ms INTEGER CHECK ( duration_ms IS NULL OR duration_ms >= 0 ),
  width INTEGER CHECK ( width IS NULL OR width > 0 ),
  height INTEGER CHECK ( height IS NULL OR height > 0 ),
  fps REAL CHECK ( fps IS NULL OR fps > 0 ),
  bitrate INTEGER CHECK ( bitrate IS NULL OR bitrate >= 0 ),
  container TEXT,
  video_codec TEXT,
  audio_codec TEXT,
  sample_rate INTEGER CHECK ( sample_rate IS NULL OR sample_rate > 0 ),
  channels INTEGER CHECK ( channels IS NULL OR channels > 0 ),
  encoding TEXT,

  -- Additional format-specific properties
  data_json TEXT NOT NULL DEFAULT '{}' CHECK ( json_valid( data_json ) ),

  scanned_at TEXT,
  created_at TEXT NOT NULL DEFAULT ( strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ) ),
  updated_at TEXT NOT NULL DEFAULT ( strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ) ),

  UNIQUE ( root_id, path )
);

CREATE INDEX media_type_available_idx ON media ( type, available );
CREATE INDEX media_root_idx ON media ( root_id );
CREATE INDEX media_file_name_idx ON media ( file_name COLLATE NOCASE );
CREATE INDEX media_title_idx ON media ( title COLLATE NOCASE );
CREATE INDEX media_creator_idx ON media ( creator COLLATE NOCASE );
CREATE INDEX media_size_idx ON media ( size_bytes );
CREATE INDEX media_modified_idx ON media ( modified_at );
CREATE INDEX media_duration_idx ON media ( duration_ms );
CREATE INDEX media_rating_idx ON media ( rating );
CREATE INDEX media_released_idx ON media ( released_at );
CREATE INDEX media_hash_idx ON media ( file_hash );


-- ============================================================
-- 4. Additional metadata
-- ============================================================

CREATE TABLE media_metadata (
  id INTEGER PRIMARY KEY,
  media_id INTEGER NOT NULL REFERENCES media ( id ) ON DELETE CASCADE,
  key TEXT NOT NULL COLLATE NOCASE,
  value TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual' CHECK ( source IN ( 'manual', 'scan', 'import' ) ),
  updated_at TEXT NOT NULL DEFAULT ( strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ) ),

  UNIQUE ( media_id, key, source )
);

CREATE INDEX media_metadata_key_value_idx ON media_metadata ( key, value );
CREATE INDEX media_metadata_media_idx ON media_metadata ( media_id );


-- ============================================================
-- 5. Tags and categories
-- ============================================================

CREATE TABLE tags (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE
);

CREATE TABLE media_tags (
  media_id INTEGER NOT NULL REFERENCES media ( id ) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags ( id ) ON DELETE CASCADE,
  PRIMARY KEY ( media_id, tag_id )
);

CREATE INDEX media_tags_tag_idx ON media_tags ( tag_id, media_id );

CREATE TABLE categories (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  parent_id INTEGER REFERENCES categories ( id ) ON DELETE SET NULL
);

CREATE INDEX categories_parent_idx ON categories ( parent_id );

CREATE TABLE media_categories (
  media_id INTEGER NOT NULL REFERENCES media ( id ) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories ( id ) ON DELETE CASCADE,
  PRIMARY KEY ( media_id, category_id )
);

CREATE INDEX media_categories_category_idx ON media_categories ( category_id, media_id );


-- ============================================================
-- 6. Generated assets
-- ============================================================

CREATE TABLE assets (
  id INTEGER PRIMARY KEY,
  media_id INTEGER NOT NULL REFERENCES media ( id ) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK ( kind IN (
    'poster', 'thumb', 'frames', 'wave', 'text', 'subtitle'
  ) ),
  variant TEXT NOT NULL DEFAULT 'default',
  path TEXT NOT NULL UNIQUE,
  fingerprint TEXT,
  mime_type TEXT,
  size_bytes INTEGER CHECK ( size_bytes IS NULL OR size_bytes >= 0 ),
  width INTEGER CHECK ( width IS NULL OR width > 0 ),
  height INTEGER CHECK ( height IS NULL OR height > 0 ),
  data_json TEXT NOT NULL DEFAULT '{}' CHECK ( json_valid( data_json ) ),
  created_at TEXT NOT NULL DEFAULT ( strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ) ),

  UNIQUE ( media_id, kind, variant )
);

CREATE INDEX assets_media_idx ON assets ( media_id );
CREATE INDEX assets_kind_idx ON assets ( kind );


-- ============================================================
-- 7. Background jobs
-- ============================================================

CREATE TABLE jobs (
  id INTEGER PRIMARY KEY,
  root_id INTEGER REFERENCES roots ( id ) ON DELETE CASCADE,
  media_id INTEGER REFERENCES media ( id ) ON DELETE CASCADE,

  kind TEXT NOT NULL CHECK ( kind IN (
    'scan', 'metadata', 'preview', 'frames', 'wave', 'text'
  ) ),
  status TEXT NOT NULL DEFAULT 'pending' CHECK ( status IN (
    'pending', 'running', 'done', 'failed', 'cancelled'
  ) ),
  priority INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK ( attempts >= 0 ),
  max_attempts INTEGER NOT NULL DEFAULT 3 CHECK ( max_attempts > 0 ),
  run_after_ms INTEGER NOT NULL DEFAULT ( unixepoch() * 1000 ),
  locked_at_ms INTEGER,
  worker TEXT,
  error TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}' CHECK ( json_valid( payload_json ) ),
  created_at TEXT NOT NULL DEFAULT ( strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ) ),
  updated_at TEXT NOT NULL DEFAULT ( strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ) ),
  finished_at TEXT,

  CHECK ( root_id IS NULL OR media_id IS NULL )
);

CREATE INDEX jobs_queue_idx ON jobs ( status, run_after_ms, priority DESC, id );
CREATE INDEX jobs_root_idx ON jobs ( root_id, created_at );
CREATE INDEX jobs_media_idx ON jobs ( media_id, created_at );
