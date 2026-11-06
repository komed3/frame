import { getToken, requireAuth } from '@/src/server/api/middleware';
import { Auth } from '@/src/server/core/Auth';
import { Config } from '@/src/server/core/Config';
import { Router } from 'express';


export const auth = Router();

const cookieOptions = {
  httpOnly: true, sameSite: 'strict' as const,
  secure: [ 'prod', 'production' ].includes( Config.get( 'NODE_ENV' ) )
};

const assetCookie = { ...cookieOptions, path: '/api/assets' };
const streamCookie = { ...cookieOptions, path: '/api/stream' };


auth.get( '/env', ( _, res ) => res.json( {
  appName: Config.get( 'APP_NAME' ),
  passwordStrict: Config.get( 'PASSWORD_STRICT' ),
  editorAdminOnly: Config.get( 'EDITOR_ADMIN_ONLY' )
} ) );

auth.post( '/login', async ( req, res ) => {
  const result = await Auth.login( req.body?.username, req.body?.password );
  const maxAge = Config.get( 'SESSION_LIFETIME_MS' );

  res.cookie( 'frame.asset-session', result.token, { ...assetCookie, maxAge } );
  res.cookie( 'frame.stream-session', result.token, { ...streamCookie, maxAge } );
  res.json( result );
} );

auth.get( '/me', requireAuth, ( _, res ) => res.json( { user: res.locals.user } ) );

auth.post( '/logout', requireAuth, ( req, res ) => {
  Auth.logout( getToken( req ) );

  res.clearCookie( 'frame.asset-session', assetCookie );
  res.clearCookie( 'frame.stream-session', streamCookie );
  res.status( 204 ).end();
} );
