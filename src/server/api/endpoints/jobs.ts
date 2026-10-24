import { parsePagination } from '@/src/server/api/utils';
import { JobQueue } from '@/src/server/job/Queue';
import type { JobKind, JobStatus } from '@/src/shared/types/job';
import { Router } from 'express';


export const jobs = Router();


jobs.get( '/stats', ( _, res ) => res.json( JobQueue.getStats() ) );

jobs.get( '/', ( req, res ) => {
  const { status, kind, rootId, mediaId } = req.query;
  const pagination = parsePagination( req.query.limit, req.query.offset );
  if ( ! pagination ) return res.status( 400 ).json( { error: 'Invalid pagination options' } );

  res.json( JobQueue.list( status as JobStatus | undefined, pagination.limit, pagination.offset, {
    kind: kind as JobKind | undefined,
    rootId: rootId === undefined ? undefined : Number( rootId ),
    mediaId: mediaId === undefined ? undefined : Number( mediaId )
  } ) );
} );
