import { parseId } from '@/src/server/api/utils';
import { Auth } from '@/src/server/core/Auth';
import { Markers } from '@/src/server/core/Markers';
import { Playlists } from '@/src/server/core/Playlists';
import { Media } from '@/src/server/media/Media';
import { MediaRoots } from '@/src/server/media/Roots';
import type { ErrorRequestHandler, Request, RequestHandler, RequestParamHandler } from 'express';


export function getToken ( req: Request ) : string | null {
  return req.get( 'authorization' )?.match( /^Bearer\s+(\S+)$/i )?.[ 1 ] ?? null;
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
