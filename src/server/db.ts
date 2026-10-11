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


const migrations: Migration[] = [];


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
