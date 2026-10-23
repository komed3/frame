import { MediaMetadata } from '@/src/server/media/Metadata';
import { Media } from '@/src/server/media/Media';
import { MediaSearch } from '@/src/server/media/Search';
import type { MediaSearchOptions } from '@/src/shared/types/search';
import { parseId } from '@/src/server/api/utils';
import { Router } from 'express';


export const media = Router();


media.get( '/', ( req, res ) => res.json( Media.list( {
  limit: Number( req.query.limit ?? 100 ), offset: Number( req.query.offset ?? 0 )
} ) ) );

media.post( '/search', ( req, res ) => {
  const options = req.body as MediaSearchOptions;
  if ( ! options || typeof options !== 'object' || Array.isArray( options ) )
    return res.status( 400 ).json( { error: 'Search options must be an object' } );

  res.json( MediaSearch.search( { ...options, userId: res.locals.user.id } ) );
} );
