import { Plays } from '@/src/server/core/Plays';
import { Media } from '@/src/server/media/Media';
import { parsePagination } from '@/src/server/utils';
import { Router } from 'express';


export const plays = Router();


plays.get( '/', ( req, res ) => {
  const { limit, offset } = parsePagination( req.query.limit, req.query.offset );
  res.json( Plays.listByUser( res.locals.user.id, limit, offset ).map( play => ( { ...play,
    media: Media.get( play.mediaId )
  } ) ) );
} );

plays.get( '/status', ( req, res ) => {
  const mediaIds = typeof req.query.mediaIds === 'string' ? req.query.mediaIds.split( ',' ) : [];
  res.json( Plays.listStatusByUser( res.locals.user.id, mediaIds ) );
} );

plays.post( '/', ( req, res ) => {
  const userId = res.locals.user.id, id = Plays.start( userId, req.body?.mediaId, req.body?.sessionId ?? null );
  res.status( 201 ).json( { id, watchedMs: Plays.get( userId, id )?.watchedMs ?? 0 } );
} );

plays.patch< { id: string } >( '/:id', ( req, res ) => {
  Plays.update( res.locals.user.id, req.params.id, Number( req.body?.watchedMs ), !! req.body?.completed );
  res.status( 204 ).end();
} );

plays.put< { id: string } >( '/:id/finish', ( req, res ) => {
  Plays.finish( res.locals.user.id, req.params.id, Number( req.body?.watchedMs ), !! req.body?.completed );
  res.status( 204 ).end();
} );
