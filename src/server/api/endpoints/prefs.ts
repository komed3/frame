import { Pref } from '@/src/server/core/Pref';
import { Router } from 'express';


export const prefs = Router();


prefs.get( '/', ( _, res ) => res.json( { schema: Pref.schema, values: Pref.all( res.locals.user.id ) } ) );
prefs.delete( '/', ( _, res ) => res.json( { deleted: Pref.resetAll( res.locals.user.id ) } ) );

prefs.get( '/:key', ( req, res ) => {
  const key = Pref.resolveName( req.params.key );
  res.json( { key, value: Pref.get( res.locals.user.id, key ) } );
} );

prefs.put( '/:key', ( req, res ) => {
  const key = Pref.resolveName( req.params.key );
  res.json( { key, value: Pref.set( res.locals.user.id, key, req.body?.value ) } );
} );

prefs.delete( '/:key', ( req, res ) => res.json( { deleted: Pref.reset(
  res.locals.user.id, Pref.resolveName( req.params.key )
) } ) );
