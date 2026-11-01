import { Progress } from '@/src/server/core/Progress';
import { Router } from 'express';


export const progress = Router();


progress.get( '/:mediaId', ( req, res ) => res.json( Progress.get( res.locals.user.id, req.params.mediaId ) ) );

progress.put< { mediaId: string } >( '/:mediaId', ( req, res ) => res.json(
  Progress.save( res.locals.user.id, req.params.mediaId, Number( req.body?.positionMs ), !! req.body?.completed )
) );

progress.delete< { mediaId: string } >( '/:mediaId', ( req, res ) => {
  Progress.delete( res.locals.user.id, req.params.mediaId );
  res.status( 204 ).end();
} );
