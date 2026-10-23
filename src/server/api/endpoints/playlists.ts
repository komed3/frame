import { assertMediaId } from '@/src/server/api/middleware';
import { parseId, parsePagination } from '@/src/server/api/utils';
import { Playlists } from '@/src/server/core/Playlists';
import type { PlaylistUpdate } from '@/src/shared/types/playlists';
import type { RequestParamHandler } from 'express';
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
