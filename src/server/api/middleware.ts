import { parseId } from '@/src/server/api/utils';
import { Auth } from '@/src/server/core/Auth';
import { Media } from '@/src/server/media/Media';
import type { Request, RequestHandler, RequestParamHandler } from 'express';


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
