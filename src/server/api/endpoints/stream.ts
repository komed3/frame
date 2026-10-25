import { Stream, StreamError } from '@/src/server/media/Stream';
import { type RequestHandler, Router } from 'express';


export const stream = Router();


const handleStream: RequestHandler = ( req, res, next ) => void ( async () => {
  try {
    const result = await Stream.open(
      req.params.id as string, req.get( 'range' ),
      req.get( 'if-range' ), req.method === 'HEAD' ? 'HEAD' : 'GET'
    );

    res.status( result.status );

    for ( const [ name, value ] of Object.entries( result.headers ) ) res.setHeader( name, value );
    if ( ! result.body ) { res.end(); return }

    res.once( 'close', () => { if ( ! res.writableFinished ) result.body?.destroy() } );

    result.body.once( 'error', err => {
      if ( res.headersSent ) res.destroy( err );
      else next( err );
    } );

    result.body.pipe( res );
  } catch ( err ) {
    if ( err instanceof StreamError ) {
      for ( const [ name, value ] of Object.entries( err.headers ) ) res.setHeader( name, value );

      res.status( err.status ).json( { error: err.message } );
      return;
    }

    next( err );
  }
} )();


stream.get( '/:id', handleStream );
stream.head( '/:id', handleStream );
