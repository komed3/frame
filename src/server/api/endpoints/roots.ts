import { assertRootId } from '@/src/server/api/middleware';
import { JobQueue } from '@/src/server/job/Queue';
import { MediaRoots } from '@/src/server/media/Roots';
import { Router } from 'express';


export const roots = Router();
roots.param( 'id', assertRootId );


roots.get( '/', ( _, res ) => res.json( MediaRoots.list() ) );

roots.post( '/:id/scan', ( _, res ) => {
  const jobId = JobQueue.enqueue( { kind: 'scan', rootId: res.locals.root.id } );
  res.status( 202 ).json( { jobId } );
} );
