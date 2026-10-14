import { Config } from '@/src/server/core/Config';
import type { AppliedMigration, DatabaseStats } from '@/src/shared/types/database';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';


export class Database {
  private connection: DatabaseSync | null = null;
  private transactionActive = false;

  private migrate () : void {
    const db = this.db;
    const migrationsPath = resolve( 'schema/migrations' );

    db.exec( `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        checksum TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT ( strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ) )
      );
    ` );

    for ( const name of readdirSync( migrationsPath ).filter( ( name ) => /^.*\.sql$/i.test( name ) ).sort() ) {
      const sql = readFileSync( join( migrationsPath, name ), 'utf8' );
      const checksum = createHash( 'sha256' ).update( sql ).digest( 'hex' );
      const existing = db.prepare( 'SELECT checksum FROM schema_migrations WHERE name = ?' ).get( name );

      if ( existing ) {
        if ( typeof existing !== 'object' || ! ( 'checksum' in existing ) || existing.checksum !== checksum )
          throw new Error( `An already applied migration has been modified: ${ name }` );

        continue;
      }

      this.transaction( conn => {
        conn.exec( sql );
        conn.prepare( 'INSERT INTO schema_migrations ( name, checksum ) VALUES ( ?, ? )' ).run( name, checksum );
      } );
    }
  }

  public get isOpen () : boolean {
    return this.connection !== null;
  }

  public get db () : DatabaseSync {
    if ( ! this.connection ) throw new Error( 'Database connection is not open' );
    return this.connection;
  }

  public open () : this {
    if ( this.connection ) return this;

    const path = Config.get( 'DB_PATH' );
    if ( path !== ':memory:' ) mkdirSync( dirname( path ), { recursive: true } );

    const conn = new DatabaseSync( path );

    try {
      conn.exec( `
        PRAGMA foreign_keys = ON;
        PRAGMA busy_timeout = ${ Config.get( 'DB_BUSY_TIMEOUT_MS' ) };
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
      ` );

      this.connection = conn;
      this.migrate();

      return this;
    } catch ( err ) {
      this.connection = null;
      conn.close();
      throw err;
    }
  }

  public close () : void {
    if ( ! this.connection ) return;

    if ( this.transactionActive )
      throw new Error( 'Database cannot be closed while a transaction is running' );

    this.connection.close();
    this.connection = null;
  }

  public listMigrations () : AppliedMigration[] {
    return as< AppliedMigration[] >( this.open().db.prepare( `
      SELECT name, checksum, applied_at AS appliedAt
      FROM schema_migrations
      ORDER BY applied_at, name
    ` ).all() );
  }

  public getStats () : DatabaseStats {
    const db = this.open().db, path = Config.get( 'DB_PATH' );
    const tables = as< { name: string }[] >( db.prepare( `
      SELECT name
      FROM sqlite_schema
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    ` ).all() );

    const rowCount = tables.reduce( ( count, table ) => {
      const result = as< { count: number } >( db.prepare(
        `SELECT COUNT(*) AS count FROM "${ table.name.replace( /"/g, '""' ) }"`
      ).get() );

      return count + result.count;
    }, 0 );

    const sizeBytes = path === ':memory:' ? 0 : [ path, `${ path }-wal`, `${ path }-shm` ].reduce(
      ( size, file ) => size + ( existsSync( file ) ? statSync( file ).size : 0 ), 0
    );

    const sqlite = as< { version: string } >( db.prepare( 'SELECT sqlite_version() AS version' ).get() );
    const pages = as< { page_count: number } >( db.prepare( 'PRAGMA page_count' ).get() );
    const pageSize = as< { page_size: number } >( db.prepare( 'PRAGMA page_size' ).get() );
    const freePages = as< { freelist_count: number } >( db.prepare( 'PRAGMA freelist_count' ).get() );
    const migrations = as< { count: number } >( db.prepare( 'SELECT COUNT(*) AS count FROM schema_migrations' ).get() );
    const integrity = as< { integrity_check: string } >( db.prepare( 'PRAGMA integrity_check' ).get() );

    return {
      path, sqliteVersion: sqlite.version, tableCount: tables.length, rowCount,
      migrationCount: migrations.count, sizeBytes, pageCount: pages.page_count,
      pageSize: pageSize.page_size, freePages: freePages.freelist_count,
      integrityCheck: integrity.integrity_check
    };
  }

  public reset () : number {
    const path = Config.get( 'DB_PATH' );
    this.close();

    if ( path !== ':memory:' )
      for ( const file of [ path, `${ path }-wal`, `${ path }-shm` ] )
        rmSync( file, { force: true } );

    this.open();
    return this.listMigrations().length;
  }

  public transaction < T > ( callback: ( db: DatabaseSync ) => T ) : T {
    const db = this.db;
    if ( this.transactionActive ) throw new Error( 'Nested transactions are not supported' );

    db.exec( 'BEGIN IMMEDIATE' );
    this.transactionActive = true;

    try {
      const result = callback( db );
      if ( result && typeof result === 'object' && 'then' in result )
        throw new Error( 'Database transactions must execute synchronously' );

      db.exec( 'COMMIT' );
      return result;
    } catch ( err ) {
      try { db.exec( 'ROLLBACK' ) }
      catch { /** Preserve the original transaction error */ }

      throw err;
    } finally {
      this.transactionActive = false;
    }
  }
}


export const as = < T > ( value: unknown ) : T => value as T;
export const db = new Database();
export const conn = () => db.open().db;
