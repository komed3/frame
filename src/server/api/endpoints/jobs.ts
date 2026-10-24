import { parseId, parsePagination } from '@/src/server/api/utils';
import { JobQueue } from '@/src/server/job/Queue';
import type { JobKind, JobStatus } from '@/src/shared/types/job';
import { Router } from 'express';


export const jobs = Router();


jobs.get( '/stats', ( _, res ) => res.json( JobQueue.getStats() ) );

jobs.get( '/', ( req, res ) => {
  const { status, kind, rootId, mediaId } = req.query;
  const pagination = parsePagination( req.query.limit, req.query.offset );

  res.json( JobQueue.list( status as JobStatus | undefined, pagination.limit, pagination.offset, {
    kind: kind as JobKind | undefined,
    rootId: rootId === undefined ? undefined : Number( rootId ),
    mediaId: mediaId === undefined ? undefined : Number( mediaId )
  } ) );
} );

jobs.get( '/:id', ( req, res ) => {
  const id = parseId( req.params.id );
  if ( id === null ) return res.status( 400 ).json( { error: 'Invalid job ID' } );

  const job = JobQueue.get( id );
  if ( ! job ) return res.status( 404 ).json( { error: 'Job not found' } );

  res.json( job );
} );

jobs.post( '/', ( req, res ) => {
  const id = JobQueue.enqueue( req.body );
  res.status( 202 ).json( { job: JobQueue.get( id ) } );
} );
