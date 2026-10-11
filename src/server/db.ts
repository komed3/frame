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
