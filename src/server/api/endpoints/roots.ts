import { parseId } from '@/src/server/api/utils';
import { JobQueue } from '@/src/server/job/Queue';
import { MediaRoots } from '@/src/server/media/Roots';
import { Router } from 'express';


export const roots = Router();


roots.get( '/', ( _, res ) => res.json( MediaRoots.list() ) );

roots.post( '/:id/scan', ( req, res ) => {
  const id = parseId( req.params.id );
  if ( id === null ) return res.status( 400 ).json( { error: 'Invalid root ID' } );

  const root = MediaRoots.list().find( root => root.id === id );
  if ( ! root ) return res.status( 404 ).json( { error: 'Root not found' } );
  if ( ! root.enabled ) return res.status( 409 ).json( { error: 'Root is disabled' } );

  const jobId = JobQueue.enqueue( { kind: 'scan', rootId: id } );
  res.status( 202 ).json( { jobId } );
} );
