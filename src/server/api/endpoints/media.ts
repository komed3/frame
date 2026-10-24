import { assertMediaId } from '@/src/server/api/middleware';
import { parsePagination } from '@/src/server/api/utils';
import { Markers } from '@/src/server/core/Markers';
import { Media } from '@/src/server/media/Media';
import { MediaMetadata } from '@/src/server/media/Metadata';
import { MediaTaxonomy } from '@/src/server/media/Taxonomy';
import { Router } from 'express';


export const media = Router();
media.param( 'id', assertMediaId );


media.get( '/', ( req, res ) => {
  const pagination = parsePagination( req.query.limit, req.query.offset );
  if ( ! pagination ) return res.status( 400 ).json( { error: 'Invalid pagination options' } );

  res.json( Media.list( pagination ) );
} );

media.get( '/:id', ( _, res ) => res.json( Media.get( res.locals.mediaId ) ) );
media.get( '/:id/metadata', ( _, res ) => res.json( MediaMetadata.list( res.locals.mediaId ) ) );
media.get( '/:id/tags', ( _, res ) => res.json( MediaTaxonomy.getMediaTags( res.locals.mediaId ) ) );
media.get( '/:id/categories', ( _, res ) => res.json( MediaTaxonomy.getMediaCategories( res.locals.mediaId ) ) );

media.put( '/:id/metadata/:key', ( req, res ) => {
  MediaMetadata.set( res.locals.mediaId, req.params.key, req.body?.value, 'manual' );
  res.json( MediaMetadata.get( res.locals.mediaId, req.params.key, 'manual' ) );
} );

media.delete( '/:id/metadata/:key', ( req, res ) => {
  MediaMetadata.delete( res.locals.mediaId, req.params.key, 'manual' );
  res.status( 204 ).end();
} );

media.put( '/:id/tags', ( req, res ) => {
  MediaTaxonomy.setMediaTags( res.locals.mediaId, req.body?.tagIds );
  res.json( MediaTaxonomy.getMediaTags( res.locals.mediaId ) );
} );

media.put( '/:id/categories', ( req, res ) => {
  MediaTaxonomy.setMediaCategories( res.locals.mediaId, req.body?.categoryIds );
  res.json( MediaTaxonomy.getMediaCategories( res.locals.mediaId ) );
} );

media.get( '/:id/markers', ( req, res ) => {
  const pagination = parsePagination( req.query.limit, req.query.offset );
  if ( ! pagination ) return res.status( 400 ).json( { error: 'Invalid pagination options' } );

  res.json( Markers.mediaMarker( res.locals.user.id, res.locals.mediaId, pagination.limit, pagination.offset ) );
} );

media.post( '/:id/markers', ( req, res ) => {
  const { positionMs, title, description } = req.body ?? {};
  const id = Markers.create( res.locals.user.id, res.locals.mediaId, positionMs, title, description );
  res.status( 201 ).json( Markers.get( res.locals.user.id, id ) );
} );

media.delete( '/:id/markers', ( _, res ) => res.json( {
  deleted: Markers.clearMediaMarker( res.locals.user.id, res.locals.mediaId )
} ) );
