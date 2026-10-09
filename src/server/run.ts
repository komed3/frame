import { config } from 'dotenv';
import express from 'express';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import api from '@/src/server/api';


const __dirname = dirname( fileURLToPath( import.meta.url ) );
config( { quiet: true } );


async function run () : Promise< void > {
  const port = Number( process.env.PORT || 3000 );
  const app = express();

  if ( ! Number.isInteger( port ) || port < 1 || port > 65535 )
    throw new Error( 'PORT must be an integer between 1 and 65535' );

  app.disable( 'x-powered-by' );
  app.use( express.json( { limit: '32kb' } ) );
  app.use( express.urlencoded( { extended: true, limit: '32kb' } ) );
  app.use( '/api', api );
}
