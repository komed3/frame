import { config } from 'dotenv';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';


config( { quiet: true } );

const databasePath = resolve( process.env.FRAME_DB_PATH || 'data/frame.sqlite' );
mkdirSync( dirname( databasePath ), { recursive: true } );
