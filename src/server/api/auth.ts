import { getToken, requireAuth } from '@/src/server/api/middleware';
import { Auth } from '@/src/server/core/Auth';
import { Router } from 'express';


export const auth = Router();


auth.get( '/me', requireAuth, ( _, res ) => res.json( { user: res.locals.user } ) );

auth.post( '/login', async ( req, res, next ) => {
  const { username, password } = req.body ?? {};

  if ( typeof username !== 'string' || typeof password !== 'string' )
    return res.status( 400 ).json( { error: 'Username and password are required' } );

  try { res.json( await Auth.login( username, password ) ) }
  catch ( err ) {
    if ( err instanceof Error && err.message === 'Invalid username or password' )
      return res.status( 401 ).json( { error: 'Invalid username or password' } );

    next( err );
  }
} );

auth.post( '/logout', requireAuth, ( req, res ) => {
  Auth.logout( getToken( req ) );
  res.status( 204 ).end();
} );
