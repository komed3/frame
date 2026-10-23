import { assets } from '@/src/server/api/endpoints/assets';
import { auth } from '@/src/server/api/endpoints/auth';
import { directories } from '@/src/server/api/endpoints/directories';
import { media } from '@/src/server/api/endpoints/media';
import { roots } from '@/src/server/api/endpoints/roots';
import { stream } from '@/src/server/api/endpoints/stream';
import { requireAuth } from '@/src/server/api/middleware';
import { Router } from 'express';


export const api = Router();


api.get( '/health', ( _, res ) => res.json( { status: 'ok' } ) );
api.use( '/auth', auth );

api.use( requireAuth );
api.use( '/roots', roots );
api.use( '/directories', directories );
api.use( '/media', media );
api.use( '/assets', assets );
api.use( '/stream', stream );
