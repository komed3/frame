import { assets } from '@/src/server/api/endpoints/assets';
import { auth } from '@/src/server/api/endpoints/auth';
import { directories } from '@/src/server/api/endpoints/directories';
import { favorites } from '@/src/server/api/endpoints/favorites';
import { markers } from '@/src/server/api/endpoints/markers';
import { media } from '@/src/server/api/endpoints/media';
import { playlists } from '@/src/server/api/endpoints/playlists';
import { roots } from '@/src/server/api/endpoints/roots';
import { stream } from '@/src/server/api/endpoints/stream';
import { categories, tags } from '@/src/server/api/endpoints/taxonomy';
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
api.use( '/tags', tags );
api.use( '/categories', categories );
api.use( '/favorites', favorites );
api.use( '/markers', markers );
api.use( '/playlists', playlists );

api.use( ( _, res ) => res.status( 404 ).json( { error: 'API endpoint not found' } ) );
