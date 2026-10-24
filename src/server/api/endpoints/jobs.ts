import { parseId, parsePagination } from '@/src/server/api/utils';
import { JobQueue } from '@/src/server/job/Queue';
import type { JobKind, JobStatus } from '@/src/shared/types/job';
import { Router } from 'express';


export const jobs = Router();


jobs.get( '/stats', ( _, res ) => res.json( JobQueue.getStats() ) );
