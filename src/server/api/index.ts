import { assets } from '@/src/server/api/endpoints/assets';
import { auth } from '@/src/server/api/endpoints/auth';
import { database } from '@/src/server/api/endpoints/db';
import { directories } from '@/src/server/api/endpoints/directories';
import { favorites } from '@/src/server/api/endpoints/favorites';
import { jobs } from '@/src/server/api/endpoints/jobs';
import { markers } from '@/src/server/api/endpoints/markers';
import { media } from '@/src/server/api/endpoints/media';
import { playlists } from '@/src/server/api/endpoints/playlists';
import { prefs } from '@/src/server/api/endpoints/prefs';
import { roots } from '@/src/server/api/endpoints/roots';
import { search } from '@/src/server/api/endpoints/search';
import { stream } from '@/src/server/api/endpoints/stream';
import { categories, tags } from '@/src/server/api/endpoints/taxonomy';
import { errorHandler, requireAuth } from '@/src/server/api/middleware';
import { Router } from 'express';


export const api = Router();


api.get( '/health', ( _, res ) => res.json( { status: 'ok' } ) );
api.use( '/auth', auth );

api.use( requireAuth );
api.use( '/root', roots );
api.use( '/dir', directories );
api.use( '/media', media );
api.use( '/search', search );
api.use( '/assets', assets );
api.use( '/stream', stream );
api.use( '/tag', tags );
api.use( '/category', categories );
api.use( '/favorite', favorites );
api.use( '/marker', markers );
api.use( '/playlist', playlists );
api.use( '/pref', prefs );
api.use( '/db', database );
api.use( '/job', jobs );

api.use( ( _, res ) => res.status( 404 ).json( { error: 'API endpoint not found' } ) );
api.use( errorHandler );
