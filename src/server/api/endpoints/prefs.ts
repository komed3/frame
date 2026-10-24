import { Pref } from '@/src/server/core/Pref';
import type { PrefName } from '@/src/shared/types/pref';
import { Router } from 'express';


export const prefs = Router();


prefs.get( '/', ( _, res ) => res.json( { schema: Pref.schema, values: Pref.all( res.locals.user.id ) } ) );
