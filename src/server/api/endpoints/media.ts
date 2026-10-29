import { requireEditorAccess } from '@/src/server/api/middleware';
import { Markers } from '@/src/server/core/Markers';
import { Media } from '@/src/server/media/Media';
import { MediaMetadata } from '@/src/server/media/Metadata';
import { MediaTaxonomy } from '@/src/server/media/Taxonomy';
import { parsePagination } from '@/src/server/utils';
import { Router } from 'express';


export const media = Router();


media.get( '/', ( req, res ) => {
  const pagination = parsePagination( req.query.limit, req.query.offset );
  res.json( Media.list( pagination ) );
} );

media.get< { id: string } >( '/:id', ( req, res ) => res.json( Media.get( req.params.id ) ) );
media.get< { id: string } >( '/:id/metadata', ( req, res ) => res.json( MediaMetadata.list( req.params.id ) ) );
media.get< { id: string } >( '/:id/tags', ( req, res ) => res.json( MediaTaxonomy.getMediaTags( req.params.id ) ) );
media.get< { id: string } >( '/:id/categories', ( req, res ) => res.json( MediaTaxonomy.getMediaCategories( req.params.id ) ) );

media.patch< { id: string } >( '/:id', requireEditorAccess, ( req, res ) => {
  const { title, description, creator, rating } = req.body ?? {};

  Media.update( req.params.id, {
    title: String( title ), description: String( description ), creator: String( creator ),
    rating: Math.max( 0, Math.min( 10, Number( rating ) ) )
  } );

  res.status( 204 ).end();
} );

media.put< { id: string, key: string } >( '/:id/metadata/:key', requireEditorAccess, ( req, res ) => {
  MediaMetadata.set( req.params.id, req.params.key, req.body?.value, 'manual' );
  res.json( MediaMetadata.get( req.params.id, req.params.key, 'manual' ) );
} );

media.delete< { id: string, key: string } >( '/:id/metadata/:key', requireEditorAccess, ( req, res ) => {
  MediaMetadata.delete( req.params.id, req.params.key, 'manual' );
  res.status( 204 ).end();
} );

media.put< { id: string } >( '/:id/tags', requireEditorAccess, ( req, res ) => {
  MediaTaxonomy.setMediaTags( req.params.id, req.body?.tagIds );
  res.json( MediaTaxonomy.getMediaTags( req.params.id ) );
} );

media.put< { id: string } >( '/:id/categories', requireEditorAccess, ( req, res ) => {
  MediaTaxonomy.setMediaCategories( req.params.id, req.body?.categoryIds );
  res.json( MediaTaxonomy.getMediaCategories( req.params.id ) );
} );

media.get< { id: string } >( '/:id/markers', ( req, res ) => {
  const pagination = parsePagination( req.query.limit, req.query.offset );
  res.json( Markers.mediaMarker( res.locals.user.id, req.params.id, pagination.limit, pagination.offset ) );
} );

media.post< { id: string } >( '/:id/markers', ( req, res ) => {
  const { positionMs, title, description } = req.body ?? {};
  const id = Markers.create( res.locals.user.id, req.params.id, positionMs, title, description );
  res.status( 201 ).json( { id } );
} );

media.delete< { id: string } >( '/:id/markers', ( req, res ) => res.json( {
  deleted: Markers.clearMediaMarker( res.locals.user.id, req.params.id )
} ) );
