import { Pref } from '@/src/server/core/Pref';
import type { PrefSchema } from '@/src/shared/types/pref';
import { Router } from 'express';


export const prefs = Router();


prefs.get( '/', ( _, res ) => res.json( { schema: Pref.schema, values: Pref.all( res.locals.user.id ) } ) );
prefs.delete( '/', ( _, res ) => res.json( { deleted: Pref.resetAll( res.locals.user.id ) } ) );

prefs.get( '/:key', ( req, res ) => res.json( { key: req.params.key, value: Pref.get(
  res.locals.user.id, req.params.key as keyof PrefSchema
) } ) );

prefs.put( '/:key', ( req, res ) => res.json( { key: req.params.key, value: Pref.set(
  res.locals.user.id, req.params.key as keyof PrefSchema, req.body?.value
) } ) );

prefs.delete( '/:key', ( req, res ) => res.json( { deleted: Pref.reset(
  res.locals.user.id, req.params.key as keyof PrefSchema
) } ) );
