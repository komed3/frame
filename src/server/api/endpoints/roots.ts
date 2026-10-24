import { JobQueue } from '@/src/server/job/Queue';
import { MediaRoots } from '@/src/server/media/Roots';
import { Router } from 'express';


export const roots = Router();


roots.get( '/', ( _, res ) => res.json( MediaRoots.list() ) );

roots.post( '/scan-all', ( _, res ) => {
  for ( const { id } of MediaRoots.list( true ) ) JobQueue.enqueue( { kind: 'scan', rootId: id } );
  res.status( 202 ).json( { message: 'Scan jobs enqueued' } );
} );

roots.post( '/:id/scan', ( req, res ) => {
  const jobId = JobQueue.enqueue( { kind: 'scan', rootId: req.params.id } );
  res.status( 202 ).json( { jobId } );
} );
