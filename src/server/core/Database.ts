import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Config } from '@/src/server/core/Config';


export class Database {
  private connection: DatabaseSync | null = null;
  private transactionDepth = 0;

  public get isOpen () : boolean {
    return this.connection !== null;
  }

  public get db () : DatabaseSync {
    if ( ! this.connection ) throw new Error( 'The database connection is not open.' );
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
}
