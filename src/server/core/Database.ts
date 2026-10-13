import { Config } from '@/src/server/core/Config';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';


export class Database {
  private connection: DatabaseSync | null = null;
  private transactionDepth = 0;

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

    if ( ! existsSync( migrationsPath ) )
      throw new Error( `Migrations directory does not exist: ${ migrationsPath }` );

    const files = readdirSync( migrationsPath )
      .filter( ( name ) => /^\d+__.*\.sql$/i.test( name ) )
      .sort( ( a, b ) => a.localeCompare( b, 'en' ) );

    for ( const name of files ) {
      const path = join( migrationsPath, name );
      const sql = readFileSync( path, 'utf8' );
      const checksum = createHash( 'sha256' ).update( sql ).digest( 'hex' );
      const existing = db.prepare( `
        SELECT checksum
        FROM schema_migrations
        WHERE name = ?
      ` ).get( name );

      if ( existing && typeof existing === 'object' && 'checksum' in existing ) {
        if ( existing.checksum !== checksum )
          throw new Error( `An already applied migration has been modified: ${ name }` );

        continue;
      }

      const migration = sql
        .replace( /^\s*PRAGMA\s+foreign_keys\s*=\s*ON\s*;\s*/gim, '' )
        .replace( /^\s*BEGIN\s+IMMEDIATE\s*;\s*/gim, '' )
        .replace( /^\s*COMMIT\s*;\s*$/gim, '' );

      this.transaction( ( connection ) => {
        connection.exec( migration );

        connection.prepare( `
          INSERT INTO schema_migrations ( name, checksum )
          VALUES ( ?, ? )
        ` ).run( name, checksum );
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

    if ( Config.DB_PATH !== ':memory:' ) mkdirSync( dirname( resolve( Config.DB_PATH ) ), { recursive: true } );
    const connection = new DatabaseSync( Config.DB_PATH );

    try {
      connection.exec( `
        PRAGMA foreign_keys = ON;
        PRAGMA busy_timeout = ${ Config.DB_BUSY_TIMEOUT_MS };
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
      ` );

      this.connection = connection;
      this.migrate();

      return this;
    } catch ( err ) {
      this.connection = null;
      connection.close();
      throw err;
    }
  }

  public close () : void {
    if ( ! this.connection ) return;

    if ( this.transactionDepth > 0 )
      throw new Error( 'Database cannot be closed while a transaction is running' );

    this.connection.close();
    this.connection = null;
  }

  public transaction < T > ( callback: ( db: DatabaseSync ) => T ) : T {
    const db = this.db;
    if ( this.transactionDepth > 0 ) throw new Error( 'Nested transactions are not supported' );

    db.exec( 'BEGIN IMMEDIATE' );
    this.transactionDepth++;

    try {
      const result = callback( db );

      if ( result && typeof result === 'object' && 'then' in result )
        throw new Error( 'Database transactions must execute synchronously' );

      db.exec( 'COMMIT' );

      return result;
    } catch ( error ) {
      db.exec( 'ROLLBACK' );
      throw error;
    } finally {
      this.transactionDepth--;
    }
  }
}
