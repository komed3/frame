import { Pref } from '@/src/server/core/Pref';
import type { PrefName } from '@/src/shared/types/pref';
import { Router } from 'express';


export const prefs = Router();


prefs.get( '/', ( _, res ) => res.json( { schema: Pref.schema, values: Pref.all( res.locals.user.id ) } ) );

prefs.get( '/:key', ( req, res, next ) => {
  try {
    const key = Pref.resolveName( req.params.key );
    res.json( { key, value: Pref.get( res.locals.user.id, key ) } );
  } catch ( err ) {
    if ( err instanceof Error && err.message.startsWith( 'Unknown preference key:' ) )
      return res.status( 404 ).json( { error: err.message } );

    next( err );
  }
} );
