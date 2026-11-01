import { Progress } from '@/src/server/core/Progress';
import { parsePagination } from '@/src/server/utils';
import { Router } from 'express';


export const progress = Router();


progress.get( '/', ( req, res ) => {
  const mediaIds = typeof req.query.mediaIds === 'string' ? req.query.mediaIds.split( ',' ) : undefined;
  const { limit, offset } = parsePagination( req.query.limit, req.query.offset );

  res.json( Progress.list( res.locals.user.id, limit, offset, mediaIds ) );
} );

progress.get( '/:mediaId', ( req, res ) => res.json( Progress.get( res.locals.user.id, req.params.mediaId ) ) );

progress.put< { mediaId: string } >( '/:mediaId', ( req, res ) => res.json(
  Progress.save( res.locals.user.id, req.params.mediaId, Number( req.body?.positionMs ), !! req.body?.completed )
) );

progress.delete< { mediaId: string } >( '/:mediaId', ( req, res ) => {
  Progress.delete( res.locals.user.id, req.params.mediaId );
  res.status( 204 ).end();
} );
