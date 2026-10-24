import { Playlists } from '@/src/server/core/Playlists';
import { parsePagination } from '@/src/server/utils';
import type { PlaylistUpdate } from '@/src/shared/types/playlists';
import { Router } from 'express';


export const playlists = Router();


playlists.get( '/', ( req, res ) => {
  const pagination = parsePagination( req.query.limit, req.query.offset );
  res.json( Playlists.list( res.locals.user.id, pagination.limit, pagination.offset ) );
} );

playlists.post( '/', ( req, res ) => {
  const id = Playlists.create( res.locals.user.id, req.body?.name, req.body?.description );
  res.status( 201 ).json( Playlists.get( res.locals.user.id, id ) );
} );

playlists.get( '/for-media/:mediaId', ( req, res ) => {
  const pagination = parsePagination( req.query.limit, req.query.offset );
  res.json( Playlists.mediaPlaylists( res.locals.user.id, req.params.mediaId, pagination.limit, pagination.offset ) );
} );

playlists.get( '/:id', ( req, res ) => res.json( Playlists.get( res.locals.user.id, req.params.id ) ) );

playlists.patch( '/:id', ( req, res ) => {
  Playlists.update( res.locals.user.id, req.params.id, req.body as PlaylistUpdate );
  res.json( Playlists.get( res.locals.user.id, req.params.id ) );
} );

playlists.delete( '/:id', ( req, res ) => {
  Playlists.delete( res.locals.user.id, req.params.id );
  res.status( 204 ).end();
} );

playlists.get( '/:id/items', ( req, res ) => {
  const pagination = parsePagination( req.query.limit, req.query.offset );
  res.json( Playlists.listItems( res.locals.user.id, req.params.id, pagination.limit, pagination.offset ) );
} );

playlists.delete( '/:id/items', ( req, res ) => res.json( {
  deleted: Playlists.clearItems( res.locals.user.id, req.params.id )
} ) );

playlists.post( '/:id/items/:mediaId', ( req, res ) => {
  Playlists.addItem( res.locals.user.id, req.params.id, req.params.mediaId );
  res.status( 201 ).json( Playlists.listItems( res.locals.user.id, req.params.id ) );
} );

playlists.get( '/:id/items/:mediaId/next', ( req, res ) => res.json(
  Playlists.nextItem( res.locals.user.id, req.params.id, req.params.mediaId )
) );

playlists.get( '/:id/items/:mediaId/prev', ( req, res ) => res.json(
  Playlists.prevItem( res.locals.user.id, req.params.id, req.params.mediaId )
) );

playlists.get( '/:id/items/:mediaId', ( req, res ) => res.json( {
  inPlaylist: Playlists.mediaInPlaylist( res.locals.user.id, req.params.id, req.params.mediaId )
} ) );

playlists.patch( '/:id/items/:mediaId', ( req, res ) => {
  Playlists.moveItem( res.locals.user.id, req.params.id, req.params.mediaId, req.body?.position );
  res.json( Playlists.listItems( res.locals.user.id, req.params.id ) );
} );

playlists.delete( '/:id/items/:mediaId', ( req, res ) => {
  Playlists.removeItem( res.locals.user.id, req.params.id, req.params.mediaId );
  res.status( 204 ).end();
} );
