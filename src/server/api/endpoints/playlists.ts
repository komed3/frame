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

  res.json( Playlists.mediaPlaylists(
    res.locals.user.id, res.locals.mediaId, pagination.limit, pagination.offset
  ) );
} );
