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
