import { assertMediaId } from '@/src/server/api/middleware';
import { parseId, parsePagination } from '@/src/server/api/utils';
import { Playlists } from '@/src/server/core/Playlists';
import type { PlaylistUpdate } from '@/src/shared/types/playlists';
import { Router } from 'express';


export const playlists = Router();
playlists.param( 'mediaId', assertMediaId );


playlists.param( 'id', ( _, res, next, value ) => {
  const id = parseId( value );
  if ( id === null ) return res.status( 400 ).json( { error: 'Invalid playlist ID' } );

  try {
    const playlist = Playlists.get( res.locals.user.id, id );
    if ( ! playlist ) return res.status( 404 ).json( { error: 'Playlist not found' } );

    res.locals.playlistId = id;
    res.locals.playlist = playlist;
    next();
  } catch ( err ) {
    if ( err instanceof Error && err.message === `Playlist ${ id } does not exist for user ${ res.locals.user.id }` )
      return res.status( 404 ).json( { error: 'Playlist not found' } );

    next( err );
  }
} );

playlists.get( '/', ( req, res ) => {
  const pagination = parsePagination( req.query.limit, req.query.offset );
  if ( ! pagination ) return res.status( 400 ).json( { error: 'Invalid pagination options' } );

  res.json( Playlists.list( res.locals.user.id, pagination.limit, pagination.offset ) );
} );

playlists.post( '/', ( req, res ) => {
  const { name, description } = req.body ?? {};

  if ( typeof name !== 'string' ) return res.status( 400 ).json( { error: 'Playlist name is required' } );

  if ( description !== undefined && description !== null && typeof description !== 'string' )
    return res.status( 400 ).json( { error: 'description must be a string or null' } );

  const id = Playlists.create( res.locals.user.id, name, description ?? undefined );
  res.status( 201 ).json( Playlists.get( res.locals.user.id, id ) );
} );

playlists.get( '/for-media/:mediaId', ( req, res ) => {
  const pagination = parsePagination( req.query.limit, req.query.offset );
  if ( ! pagination ) return res.status( 400 ).json( { error: 'Invalid pagination options' } );

  res.json( Playlists.mediaPlaylists(
    res.locals.user.id, res.locals.mediaId, pagination.limit, pagination.offset
  ) );
} );

playlists.get( '/:id', ( _, res ) => res.json( res.locals.playlist ) );

playlists.patch( '/:id', ( req, res ) => {
  const body = req.body ?? {}, patch: PlaylistUpdate = {};

  if ( body.name !== undefined ) {
    if ( typeof body.name !== 'string' )
      return res.status( 400 ).json( { error: 'name must be a string' } );

    patch.name = body.name;
  }

  if ( body.description !== undefined ) {
    if ( body.description !== null && typeof body.description !== 'string' )
      return res.status( 400 ).json( { error: 'description must be a string or null' } );

    patch.description = body.description;
  }

  if ( ! Object.keys( patch ).length ) return res.status( 400 ).json( { error: 'No playlist fields provided' } );

  Playlists.update( res.locals.user.id, res.locals.playlistId, patch );
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

playlists.delete( '/:id/items', ( _, res ) => {
  const deleted = Playlists.clearItems( res.locals.user.id, res.locals.playlistId );
  res.json( { deleted } );
} );

playlists.post( '/:id/items/:mediaId', ( _, res ) => {
  if ( Playlists.mediaInPlaylist( res.locals.user.id, res.locals.playlistId, res.locals.mediaId ) )
    return res.status( 409 ).json( { error: 'Media is already in the playlist' } );

  Playlists.addItem( res.locals.user.id, res.locals.playlistId, res.locals.mediaId );
  res.status( 201 ).json( Playlists.listItems( res.locals.user.id, res.locals.playlistId ) );
} );

playlists.get( '/:id/items/:mediaId/next', ( _, res ) => {
  if ( ! Playlists.mediaInPlaylist( res.locals.user.id, res.locals.playlistId, res.locals.mediaId ) )
    return res.status( 404 ).json( { error: 'Media is not in the playlist' } );

  res.json( Playlists.nextItem( res.locals.user.id, res.locals.playlistId, res.locals.mediaId ) );
} );

playlists.get( '/:id/items/:mediaId/prev', ( _, res ) => {
  if ( ! Playlists.mediaInPlaylist( res.locals.user.id, res.locals.playlistId, res.locals.mediaId ) )
    return res.status( 404 ).json( { error: 'Media is not in the playlist' } );

  res.json( Playlists.prevItem( res.locals.user.id, res.locals.playlistId, res.locals.mediaId ) );
} );

playlists.get( '/:id/items/:mediaId', ( _, res ) =>
  res.json( { inPlaylist: Playlists.mediaInPlaylist( res.locals.user.id, res.locals.playlistId, res.locals.mediaId ) } )
);

playlists.patch( '/:id/items/:mediaId', ( req, res ) => {
  const { position } = req.body ?? {};

  if ( ! Number.isSafeInteger( position ) || position < 0 )
    return res.status( 400 ).json( { error: 'position must be a non-negative integer' } );

  if ( ! Playlists.mediaInPlaylist( res.locals.user.id, res.locals.playlistId, res.locals.mediaId ) )
    return res.status( 404 ).json( { error: 'Media is not in the playlist' } );

  const items = Playlists.listItems( res.locals.user.id, res.locals.playlistId, Number.MAX_SAFE_INTEGER, 0 );
  if ( position >= items.length )
    return res.status( 400 ).json( { error: 'position is outside the playlist' } );

  Playlists.moveItem( res.locals.user.id, res.locals.playlistId, res.locals.mediaId, position );
  res.json( Playlists.listItems( res.locals.user.id, res.locals.playlistId ) );
} );

playlists.delete( '/:id/items/:mediaId', ( _, res ) => {
  Playlists.removeItem( res.locals.user.id, res.locals.playlistId, res.locals.mediaId );
  res.status( 204 ).end();
} );
