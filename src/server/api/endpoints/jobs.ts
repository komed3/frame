import { parseId, parsePagination } from '@/src/server/api/utils';
import { JobQueue, JOB_KINDS, JOB_STATUSES } from '@/src/server/job/Queue';
import { Media } from '@/src/server/media/Media';
import { MediaRoots } from '@/src/server/media/Roots';
import type { JobKind, JobStatus } from '@/src/shared/types/job';
import { Router } from 'express';


export const jobs = Router();


jobs.get( '/stats', ( _, res ) => res.json( JobQueue.getStats() ) );
