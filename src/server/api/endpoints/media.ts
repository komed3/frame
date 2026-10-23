import { assertMediaId } from '@/src/server/api/middleware';
import { Media } from '@/src/server/media/Media';
import { MediaMetadata } from '@/src/server/media/Metadata';
import { MediaSearch } from '@/src/server/media/Search';
import type { MediaSearchOptions } from '@/src/shared/types/search';
import { Router } from 'express';


export const media = Router();
media.param( 'id', assertMediaId );


media.get( '/', ( req, res ) => res.json( Media.list( {
  limit: Number( req.query.limit ?? 100 ), offset: Number( req.query.offset ?? 0 )
} ) ) );

media.post( '/search', ( req, res ) => {
  const options = req.body as MediaSearchOptions;
  if ( ! options || typeof options !== 'object' || Array.isArray( options ) )
    return res.status( 400 ).json( { error: 'Search options must be an object' } );

  res.json( MediaSearch.search( { ...options, userId: res.locals.user.id } ) );
} );

media.get( '/:id', ( _, res ) => {
  const item = Media.get( res.locals.mediaId );
  if ( ! item ) return res.status( 404 ).json( { error: 'Media not found' } );

  res.json( item );
} );

media.get( '/:id/metadata', ( _, res ) =>
  res.json( MediaMetadata.list( res.locals.mediaId ) )
);

media.put( '/:id/metadata/:key', ( req, res ) => {
  const { value } = req.body ?? {};
  if ( typeof value !== 'string' ) return res.status( 400 ).json( { error: 'Metadata value must be a string' } );

  MediaMetadata.set( res.locals.mediaId, req.params.key, value, 'manual' );
  res.json( MediaMetadata.get( res.locals.mediaId, req.params.key, 'manual' ) );
} );

media.delete( '/:id/metadata/:key', ( req, res ) => {
  MediaMetadata.delete( res.locals.mediaId, req.params.key, 'manual' );
  res.status( 204 ).end();
} );
