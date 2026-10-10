import { config } from 'dotenv';
import express from 'express';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import api from './api';
import { closeDatabase } from './db';
import { processMediaJob } from './jobs/processors';
import { startWorker, stopWorker } from './jobs/worker';


const __dirname = dirname( fileURLToPath( import.meta.url ) );
config( { quiet: true } );


async function run () : Promise< void > {
  const port = Number( process.env.PORT || 3000 );
  const app = express();

  if ( ! Number.isInteger( port ) || port < 1 || port > 65535 )
    throw new Error( 'PORT must be an integer between 1 and 65535' );

  // --- middleware ---

  app.disable( 'x-powered-by' );
  app.use( express.json( { limit: '32kb' } ) );
  app.use( express.urlencoded( { extended: true, limit: '32kb' } ) );
  app.use( '/api', api );

  // --- react ---

  if ( process.env.NODE_ENV === 'dev' ) {
    const { createServer } = await import( 'vite' );
    const vite = await createServer( {
      configFile: resolve( process.cwd(), 'vite.config.ts' ),
      server: { middlewareMode: true },
      appType: 'spa'
    } );

    app.use( vite.middlewares );
  } else {
    const clientDist = resolve( __dirname, '../client' );
    app.use( express.static( clientDist, { index: false, redirect: false } ) );

    app.use( ( req, res, next ) => {
      if ( req.method !== 'GET' && req.method !== 'HEAD' ) { next(); return }
      if ( req.path.startsWith( '/api/' ) ) { next(); return }
      if ( req.path !== '/' ) { res.redirect( 301, '/' ); return }

      res.sendFile( join( clientDist, 'index.html' ) );
    } );
  }

  // --- start server ---

  const server = app.listen( port, '127.0.0.1', () =>
    console.log( `Server started on port ${ port }` )
  );

  // --- background worker ---

  const worker = startWorker( processMediaJob );
  worker.catch( error => console.error( 'Background worker stopped:', error ) );

  // --- shutdown ---

  let shuttingDown = false;

  const shutdown = () => {
    if ( shuttingDown ) return;

    shuttingDown = true;
    stopWorker();

    server.close( error => {
      if ( error ) {
        console.error( error );
        process.exitCode = 1;
      }

      void worker
        .catch( error => console.error( 'Background worker stopped with an error:', error ) )
        .then( () => closeDatabase() );
    } );
  };

  process.once( 'SIGINT', shutdown );
  process.once( 'SIGTERM', shutdown );
}


run().catch( error => {
  console.error( 'Failed to start Frame:', error );
  process.exitCode = 1;
} );
