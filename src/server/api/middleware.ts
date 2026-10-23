import { parseId } from '@/src/server/api/utils';
import { Auth } from '@/src/server/core/Auth';
import { Media } from '@/src/server/media/Media';
import { MediaRoots } from '@/src/server/media/Roots';
import type { ErrorRequestHandler, Request, RequestHandler, RequestParamHandler } from 'express';


export function getToken ( req: Request ) : string | null {
  const match = req.get( 'authorization' )?.match( /^Bearer\s+(\S+)$/i );
  return match?.[ 1 ] ?? null;
}


export const requireAuth: RequestHandler = ( req, res, next ) => {
  const user = Auth.validateSession( getToken( req ) );
  if ( ! user ) return res.status( 401 ).json( { error: 'Authentication required' } );

  res.locals.user = user;
  next();
};


export const assertRootId: RequestParamHandler = ( _, res, next, value ) => {
  const id = parseId( value );
  if ( id === null ) return res.status( 400 ).json( { error: 'Invalid root ID' } );

  const root = MediaRoots.list().find( root => root.id === id );
  if ( ! root ) return res.status( 404 ).json( { error: 'Root not found' } );
  if ( ! root.enabled ) return res.status( 409 ).json( { error: 'Root is disabled' } );

  res.locals.root = root;
  next();
};


export const assertMediaId: RequestParamHandler = ( _, res, next, value ) => {
  const id = parseId( value );
  if ( id === null ) return res.status( 400 ).json( { error: 'Invalid media ID' } );

  try { Media.assertMediaIdSafe( id ) }
  catch ( err ) {
    if ( err instanceof Error && err.message === `Media ${ id } does not exist` )
      return res.status( 404 ).json( { error: 'Media not found' } );

    return next( err );
  }

  res.locals.mediaId = id;
  next();
};


export const errorHandler: ErrorRequestHandler = ( err, _, res, next ) => {
  if ( res.headersSent ) return next( err );

  const status = Number( err?.status ?? err?.statusCode );
  const clientError = status >= 400 && status < 500;

  res.status( clientError ? status : 500 ).json( {
    error: clientError && err instanceof Error ? err.message : 'Internal server error'
  } );
};
