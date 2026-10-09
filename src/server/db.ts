import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';


const databasePath = resolve( process.env.FRAME_DB_PATH || 'data/frame.sqlite' );
