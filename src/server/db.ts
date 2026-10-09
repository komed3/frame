import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';


const databasePath = resolve( process.env.FRAME_DB_PATH || 'data/frame.sqlite' );
mkdirSync( dirname( databasePath ), { recursive: true } );


export const db = new DatabaseSync( databasePath );


db.exec( `
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA busy_timeout = 5000;

  CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT ( strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ) )
  );
` );

const migrations: { version: number; sql: string }[] = [ {
  version: 1,
  sql: `
    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      username TEXT NOT NULL COLLATE NOCASE UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT ( strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ) ),
      updated_at TEXT NOT NULL DEFAULT ( strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ) ),
      disabled_at TEXT
    );

    CREATE TABLE sessions (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users( id ) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT ( strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ) ),
      expires_at TEXT NOT NULL,
      last_seen_at TEXT
    );

    CREATE INDEX sessions_user_idx ON sessions( user_id );
    CREATE INDEX sessions_expires_idx ON sessions( expires_at );

    CREATE TABLE media (
      id INTEGER PRIMARY KEY,
      relative_path TEXT NOT NULL UNIQUE,
      file_name TEXT NOT NULL,
      media_type TEXT NOT NULL CHECK (
        media_type IN ( 'video', 'image', 'text', 'audio', 'other' )
      ),
      mime_type TEXT,
      title TEXT,
      description TEXT,
      file_size INTEGER NOT NULL DEFAULT 0 CHECK ( file_size >= 0 ),
      file_mtime_ms INTEGER,
      content_hash TEXT,
      duration_ms INTEGER CHECK ( duration_ms IS NULL OR duration_ms >= 0 ),
      width INTEGER CHECK ( width IS NULL OR width > 0 ),
      height INTEGER CHECK ( height IS NULL OR height > 0 ),
      frame_rate REAL,
      bitrate INTEGER,
      container TEXT,
      video_codec TEXT,
      audio_codec TEXT,
      sample_rate INTEGER,
      channels INTEGER,
      encoding TEXT,
      language TEXT,
      release_date TEXT,
      recorded_at TEXT,
      imported_at TEXT NOT NULL DEFAULT ( strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ) ),
      scanned_at TEXT,
      metadata_json TEXT NOT NULL DEFAULT '{}'
        CHECK ( json_valid( metadata_json ) ),
      created_at TEXT NOT NULL DEFAULT ( strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ) ),
      updated_at TEXT NOT NULL DEFAULT ( strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ) )
    );

    CREATE INDEX media_type_idx ON media( media_type );
    CREATE INDEX media_title_idx ON media( title COLLATE NOCASE );
    CREATE INDEX media_size_idx ON media( file_size );
    CREATE INDEX media_duration_idx ON media( duration_ms );
    CREATE INDEX media_release_date_idx ON media( release_date );
    CREATE INDEX media_mtime_idx ON media( file_mtime_ms );
    CREATE INDEX media_dimensions_idx ON media( width, height );
    CREATE INDEX media_container_idx ON media( container );
    CREATE INDEX media_video_codec_idx ON media( video_codec );
    CREATE INDEX media_audio_codec_idx ON media( audio_codec );

    CREATE VIRTUAL TABLE media_search USING fts5(
      title,
      description,
      file_name,
      relative_path,
      content = ''
    );

    CREATE TABLE media_assets (
      id INTEGER PRIMARY KEY,
      media_id INTEGER NOT NULL REFERENCES media( id ) ON DELETE CASCADE,
      asset_type TEXT NOT NULL CHECK (
        asset_type IN (
          'poster', 'scrubber', 'image_preview',
          'text_preview', 'audio_cover', 'waveform'
        )
      ),
      relative_path TEXT NOT NULL UNIQUE,
      source_fingerprint TEXT NOT NULL,
      width INTEGER,
      height INTEGER,
      metadata_json TEXT NOT NULL DEFAULT '{}'
        CHECK ( json_valid( metadata_json ) ),
      created_at TEXT NOT NULL DEFAULT ( strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ) ),
      UNIQUE ( media_id, asset_type, source_fingerprint )
    );

    CREATE INDEX media_assets_media_idx ON media_assets( media_id );

    CREATE TABLE creators (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL COLLATE NOCASE UNIQUE,
      metadata_json TEXT NOT NULL DEFAULT '{}'
        CHECK ( json_valid( metadata_json ) )
    );

    CREATE TABLE media_creators (
      media_id INTEGER NOT NULL REFERENCES media( id ) ON DELETE CASCADE,
      creator_id INTEGER NOT NULL REFERENCES creators( id ) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'creator',
      position INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY ( media_id, creator_id, role )
    );

    CREATE INDEX media_creators_creator_idx ON media_creators( creator_id );

    CREATE TABLE categories (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL COLLATE NOCASE UNIQUE,
      parent_id INTEGER REFERENCES categories( id ) ON DELETE SET NULL,
      position INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX categories_parent_idx ON categories( parent_id );

    CREATE TABLE media_categories (
      media_id INTEGER NOT NULL REFERENCES media( id ) ON DELETE CASCADE,
      category_id INTEGER NOT NULL REFERENCES categories( id ) ON DELETE CASCADE,
      PRIMARY KEY ( media_id, category_id )
    );

    CREATE INDEX media_categories_category_idx ON media_categories( category_id );

    CREATE TABLE tags (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL COLLATE NOCASE UNIQUE
    );

    CREATE TABLE media_tags (
      media_id INTEGER NOT NULL REFERENCES media( id ) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES tags( id ) ON DELETE CASCADE,
      PRIMARY KEY ( media_id, tag_id )
    );

    CREATE INDEX media_tags_tag_idx ON media_tags( tag_id );

    CREATE TABLE playback_progress (
      user_id INTEGER NOT NULL REFERENCES users( id ) ON DELETE CASCADE,
      media_id INTEGER NOT NULL REFERENCES media( id ) ON DELETE CASCADE,
      position_ms INTEGER NOT NULL DEFAULT 0 CHECK ( position_ms >= 0 ),
      completed INTEGER NOT NULL DEFAULT 0 CHECK ( completed IN ( 0, 1 ) ),
      updated_at TEXT NOT NULL DEFAULT ( strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ) ),
      PRIMARY KEY ( user_id, media_id )
    );

    CREATE TABLE user_settings (
      user_id INTEGER NOT NULL REFERENCES users( id ) ON DELETE CASCADE,
      setting_key TEXT NOT NULL,
      value_json TEXT NOT NULL CHECK ( json_valid( value_json ) ),
      updated_at TEXT NOT NULL DEFAULT ( strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ) ),
      PRIMARY KEY ( user_id, setting_key )
    );

    CREATE TABLE favorites (
      user_id INTEGER NOT NULL REFERENCES users( id ) ON DELETE CASCADE,
      media_id INTEGER NOT NULL REFERENCES media( id ) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT ( strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ) ),
      PRIMARY KEY ( user_id, media_id )
    );

    CREATE TABLE playlists (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users( id ) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT ( strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ) ),
      updated_at TEXT NOT NULL DEFAULT ( strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ) )
    );

    CREATE TABLE playlist_items (
      playlist_id INTEGER NOT NULL REFERENCES playlists( id ) ON DELETE CASCADE,
      media_id INTEGER NOT NULL REFERENCES media( id ) ON DELETE CASCADE,
      position INTEGER NOT NULL CHECK ( position >= 0 ),
      added_at TEXT NOT NULL DEFAULT ( strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ) ),
      PRIMARY KEY ( playlist_id, media_id ),
      UNIQUE ( playlist_id, position )
    );

    CREATE TABLE markers (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users( id ) ON DELETE CASCADE,
      media_id INTEGER NOT NULL REFERENCES media( id ) ON DELETE CASCADE,
      position_ms INTEGER NOT NULL CHECK ( position_ms >= 0 ),
      title TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT ( strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ) )
    );

    CREATE INDEX markers_media_idx ON markers( media_id, position_ms );

    CREATE TABLE media_jobs (
      id INTEGER PRIMARY KEY,
      media_id INTEGER REFERENCES media( id ) ON DELETE CASCADE,
      job_type TEXT NOT NULL CHECK (
        job_type IN (
          'scan', 'poster', 'scrubber',
          'image_preview', 'text_preview',
          'audio_cover', 'waveform'
        )
      ),
      status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ( 'pending', 'running', 'completed', 'failed' )
      ),
      priority INTEGER NOT NULL DEFAULT 0,
      attempts INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 3,
      available_at_ms INTEGER NOT NULL DEFAULT ( unixepoch() * 1000 ),
      locked_at_ms INTEGER,
      worker_id TEXT,
      last_error TEXT,
      created_at TEXT NOT NULL DEFAULT ( strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ) ),
      updated_at TEXT NOT NULL DEFAULT ( strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ) ),
      UNIQUE ( media_id, job_type )
    );

    CREATE INDEX media_jobs_pending_idx
      ON media_jobs( status, available_at_ms, priority DESC, id );

    CREATE INDEX media_jobs_media_idx ON media_jobs( media_id );

    CREATE TABLE media_roots (
      id INTEGER PRIMARY KEY,
      path TEXT NOT NULL UNIQUE,
      enabled INTEGER NOT NULL DEFAULT 1 CHECK ( enabled IN ( 0, 1 ) ),
      last_scan_at TEXT,
      created_at TEXT NOT NULL DEFAULT ( strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ) )
    );
  `
} ];

const appliedMigrations = new Set( (
  db.prepare( 'SELECT version FROM schema_migrations' ).all() as { version: number }[]
).map( migration => migration.version ) );

for ( const migration of migrations ) {
  if ( appliedMigrations.has( migration.version ) ) continue;

  db.exec( 'BEGIN IMMEDIATE' );

  try {
    db.exec( migration.sql );
    db.prepare( 'INSERT INTO schema_migrations ( version ) VALUES ( ? )' ).run( migration.version );
    db.exec( 'COMMIT' );
  } catch ( error ) {
    db.exec( 'ROLLBACK' );
    throw error;
  }
}
