import { JobQueue } from '@/src/server/job/Queue';
import { parsePagination } from '@/src/server/utils';
import type { JobKind, JobStatus } from '@/src/shared/types/job';
import { Router } from 'express';


export const jobs = Router();


jobs.get( '/stats', ( _, res ) => res.json( JobQueue.getStats() ) );
jobs.get< { id: string } >( '/:id', ( req, res ) => res.json( JobQueue.get( req.params.id ) ) );

jobs.get( '/', ( req, res ) => {
  const { status, kind, rootId, mediaId } = req.query;
  const pagination = parsePagination( req.query.limit, req.query.offset );

  res.json( JobQueue.list( status as JobStatus | undefined, pagination.limit, pagination.offset, {
    kind: kind as JobKind | undefined, rootId: rootId === undefined ? undefined : String( rootId ),
    mediaId: mediaId === undefined ? undefined : String( mediaId )
  } ) );
} );

jobs.post( '/', ( req, res ) => {
  const id = JobQueue.enqueue( req.body );
  res.status( 202 ).json( { job: JobQueue.get( id ) } );
} );
