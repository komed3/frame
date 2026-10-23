import { media } from '@/src/server/api/endpoints/media';
import { stream } from '@/src/server/api/endpoints/stream';
import { Router } from 'express';


export const api = Router();


api.get( '/health', ( _, res ) => res.json( { status: 'ok' } ) );

api.use( '/media', media );
api.use( '/stream', stream );
