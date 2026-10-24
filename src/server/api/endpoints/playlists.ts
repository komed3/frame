import { assertMediaId, assertPlaylistId } from '@/src/server/api/middleware';
import { parsePagination } from '@/src/server/api/utils';
import { Playlists } from '@/src/server/core/Playlists';
import type { PlaylistUpdate } from '@/src/shared/types/playlists';
import { Router } from 'express';


export const playlists = Router();
playlists.param( 'mediaId', assertMediaId );
playlists.param( 'id', assertPlaylistId );


playlists.get( '/', ( req, res ) => {
  const pagination = parsePagination( req.query.limit, req.query.offset );
  if ( ! pagination ) return res.status( 400 ).json( { error: 'Invalid pagination options' } );

  res.json( Playlists.list( res.locals.user.id, pagination.limit, pagination.offset ) );
} );

playlists.post( '/', ( req, res ) => {
  const id = Playlists.create( res.locals.user.id, req.body?.name, req.body?.description );
  res.status( 201 ).json( Playlists.get( res.locals.user.id, id ) );
} );

playlists.get( '/for-media/:mediaId', ( req, res ) => {
  const pagination = parsePagination( req.query.limit, req.query.offset );
  if ( ! pagination ) return res.status( 400 ).json( { error: 'Invalid pagination options' } );

  res.json( Playlists.mediaPlaylists( res.locals.user.id, res.locals.mediaId, pagination.limit, pagination.offset ) );
} );

playlists.get( '/:id', ( _, res ) => res.json( res.locals.playlist ) );

playlists.patch( '/:id', ( req, res ) => {
  Playlists.update( res.locals.user.id, res.locals.playlistId, req.body as PlaylistUpdate );
  res.json( Playlists.get( res.locals.user.id, res.locals.playlistId ) );
} );

playlists.delete( '/:id', ( _, res ) => {
  Playlists.delete( res.locals.user.id, res.locals.playlistId );
  res.status( 204 ).end();
} );

playlists.get( '/:id/items', ( req, res ) => {
  const pagination = parsePagination( req.query.limit, req.query.offset );
  if ( ! pagination ) return res.status( 400 ).json( { error: 'Invalid pagination options' } );

  res.json( Playlists.listItems( res.locals.user.id, res.locals.playlistId, pagination.limit, pagination.offset ) );
} );

playlists.delete( '/:id/items', ( _, res ) => res.json( {
  deleted: Playlists.clearItems( res.locals.user.id, res.locals.playlistId )
} ) );

playlists.post( '/:id/items/:mediaId', ( _, res ) => {
  Playlists.addItem( res.locals.user.id, res.locals.playlistId, res.locals.mediaId );
  res.status( 201 ).json( Playlists.listItems( res.locals.user.id, res.locals.playlistId ) );
} );

playlists.get( '/:id/items/:mediaId/next', ( _, res ) => res.json( Playlists.nextItem(
  res.locals.user.id, res.locals.playlistId, res.locals.mediaId
) ) );

playlists.get( '/:id/items/:mediaId/prev', ( _, res ) => res.json( Playlists.prevItem(
  res.locals.user.id, res.locals.playlistId, res.locals.mediaId
) ) );

playlists.get( '/:id/items/:mediaId', ( _, res ) => res.json( {
  inPlaylist: Playlists.mediaInPlaylist( res.locals.user.id, res.locals.playlistId, res.locals.mediaId )
} ) );

playlists.patch( '/:id/items/:mediaId', ( req, res ) => {
  Playlists.moveItem( res.locals.user.id, res.locals.playlistId, res.locals.mediaId, req.body?.position );
  res.json( Playlists.listItems( res.locals.user.id, res.locals.playlistId ) );
} );

playlists.delete( '/:id/items/:mediaId', ( _, res ) => {
  Playlists.removeItem( res.locals.user.id, res.locals.playlistId, res.locals.mediaId );
  res.status( 204 ).end();
} );
