import { getToken, requireAuth } from '@/src/server/api/middleware';
import { Auth } from '@/src/server/core/Auth';
import { Config } from '@/src/server/core/Config';
import { Router } from 'express';


export const auth = Router();

const assetCookie = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: [ 'prod', 'production' ].includes( Config.get( 'NODE_ENV' ) ),
  path: '/api/assets'
};


auth.post( '/login', async ( req, res ) => {
  const result = await Auth.login( req.body?.username, req.body?.password );
  res.cookie( 'frame.asset-session', result.token, { ...assetCookie, maxAge: Config.get( 'SESSION_LIFETIME_MS' ) } );
  res.json( result );
} );

auth.get( '/me', requireAuth, ( _, res ) => res.json( { user: res.locals.user } ) );

auth.post( '/logout', requireAuth, ( req, res ) => {
  Auth.logout( getToken( req ) );
  res.clearCookie( 'frame.asset-session', assetCookie );
  res.status( 204 ).end();
} );
