import { Auth } from '@/src/server/core/Auth';
import { Config } from '@/src/server/core/Config';
import type { ErrorRequestHandler, Request, RequestHandler } from 'express';


export function getToken ( req: Request ) : string | null {
  const cookie = req.headers.cookie;

  for ( const [ path, name ] of [ [ '/api/stream/', 'frame.stream-session' ], [ '/api/assets/', 'frame.asset-session' ] ] )
    if ( req.originalUrl.startsWith( path ) ) {
      const token = cookie?.match( new RegExp( `(?:^|;\\s*)${ name }=([^;]*)` ) )?.[ 1 ];
      if ( token ) return token;
    }

  return req.get( 'authorization' )?.match( /^Bearer\s+(\S+)$/i )?.[ 1 ] ?? null;
}


export const requireAuth: RequestHandler = ( req, res, next ) => {
  const user = Auth.validateSession( getToken( req ) );
  if ( ! user ) return res.status( 401 ).json( { error: 'Authentication required' } );

  res.locals.user = user;
  next();
};


export const requireEditorAccess: RequestHandler = ( _, res, next ) => {
  if ( ! Config.get( 'EDITOR_ADMIN_ONLY' ) || res.locals.user?.isAdmin ) return next();
  res.status( 403 ).json( { error: 'Administrator access required' } );
};


export const errorHandler: ErrorRequestHandler = ( err, _, res, next ) => {
  if ( res.headersSent ) return next( err );

  const message = err instanceof Error ? err.message : '';
  const status = Number( ( err as { status?: number; statusCode?: number } )?.status ??
    ( err as { statusCode?: number } )?.statusCode );

  if ( status >= 400 && status < 600 )
    return res.status( status ).json( { error: status < 500 ? message : 'Internal server error' } );

  if ( /does not exist|not found/i.test( message ) )
    return res.status( 404 ).json( { error: message } );

  if ( /invalid|must |required|cannot|already|cycle|outside|not in the playlist/i.test( message ) )
    return res.status( 400 ).json( { error: message } );

  res.status( 500 ).json( { error: 'Internal server error' } );
};
