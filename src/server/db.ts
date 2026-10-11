import { config } from 'dotenv';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';


type Migration = {
  version: number;
  sql: string;
};


config( { quiet: true } );

const databasePath = resolve( process.env.FRAME_DB_PATH || 'data/frame.sqlite' );
mkdirSync( dirname( databasePath ), { recursive: true } );


export const db = new DatabaseSync( databasePath );
export function closeDatabase () : void { db.close() }


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


const migrations: Migration[] = [ {
  version: 1,
  sql: `
    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      username TEXT NOT NULL COLLATE NOCASE UNIQUE,
      password_hash TEXT NOT NULL,
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


    CREATE TABLE media_roots (
      id INTEGER PRIMARY KEY,
      path TEXT NOT NULL UNIQUE,
      enabled INTEGER NOT NULL DEFAULT 1 CHECK ( enabled IN ( 0, 1 ) ),
      last_scan_at TEXT,
      created_at TEXT NOT NULL DEFAULT ( strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ) )
    );

    CREATE TABLE media (
      id INTEGER PRIMARY KEY,
      relative_path TEXT NOT NULL UNIQUE,
      media_root_id INTEGER REFERENCES media_roots ( id ) ON DELETE SET NULL,
      root_relative_path TEXT,
      file_name TEXT NOT NULL,
      media_type TEXT NOT NULL CHECK ( media_type IN ( 'video', 'audio', 'image', 'text', 'other' ) ),
      mime_type TEXT,
      title TEXT,
      description TEXT,
      file_size INTEGER NOT NULL DEFAULT 0 CHECK ( file_size >= 0 ),
      file_mtime_ms REAL,
      content_hash TEXT,
      is_available INTEGER NOT NULL DEFAULT 1 CHECK ( is_available IN ( 0, 1 ) ),
      missing_since TEXT,
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
      metadata_json TEXT NOT NULL DEFAULT '{}' CHECK ( json_valid( metadata_json ) ),
      scanned_at TEXT,
      created_at TEXT NOT NULL DEFAULT ( strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ) ),
      updated_at TEXT NOT NULL DEFAULT ( strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ) ),
      UNIQUE ( media_root_id, root_relative_path )
    );

    CREATE INDEX media_type_idx ON media ( media_type );
    CREATE INDEX media_title_idx ON media ( title COLLATE NOCASE );
    CREATE INDEX media_root_availability_idx ON media ( media_root_id, is_available );
    CREATE INDEX media_hash_idx ON media ( content_hash );
    CREATE INDEX media_duration_idx ON media ( duration_ms );

    CREATE VIRTUAL TABLE media_search USING fts5 (
      title, description, file_name, relative_path
    );


    CREATE TABLE media_assets (
      id INTEGER PRIMARY KEY,
      media_id INTEGER NOT NULL REFERENCES media ( id ) ON DELETE CASCADE,
      asset_type TEXT NOT NULL CHECK ( asset_type IN ( 'poster', 'thumb', 'frames', 'wave', 'text' ) ),
      relative_path TEXT NOT NULL UNIQUE,
      source_fingerprint TEXT NOT NULL,
      width INTEGER,
      height INTEGER,
      metadata_json TEXT NOT NULL DEFAULT '{}' CHECK ( json_valid( metadata_json ) ),
      created_at TEXT NOT NULL DEFAULT ( strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ) ),
      UNIQUE ( media_id, asset_type )
    );

    CREATE INDEX media_assets_media_idx ON media_assets ( media_id );
  `
} ];


const appliedMigrations = db.prepare(
  'SELECT version FROM schema_migrations ORDER BY version'
).all() as { version: number }[];

const appliedVersions = new Set( appliedMigrations.map( migration => migration.version ) );


for ( const migration of migrations ) {
  if ( appliedVersions.has( migration.version ) ) continue;
  db.exec( 'BEGIN IMMEDIATE' );

  try {
    db.exec( migration.sql );
    db.prepare( 'INSERT INTO schema_migrations ( version ) VALUES ( ? )' ).run( migration.version );
    db.exec( 'COMMIT' );

    console.log( `Database migration ${ migration.version } applied.` );
  } catch ( error ) {
    db.exec( 'ROLLBACK' );
    throw error;
  }
}
