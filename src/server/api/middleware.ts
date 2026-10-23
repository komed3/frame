import { Auth } from '@/src/server/core/Auth';
import type { Request, RequestHandler } from 'express';


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
