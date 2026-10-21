import { as, conn, db } from '@/src/server/core/Database';
import { assertId, validateNumber } from '@/src/server/utils';
import type { EnqueueJob, JobKind, JobRecord, JobStatus } from '@/src/shared/types/job';


export const JOB_KINDS: JobKind[] = [ 'scan', 'metadata', 'preview', 'frames', 'wave', 'text' ];

const SELECT_JOB = `
  SELECT
    id, root_id AS rootId, media_id AS mediaId, kind, status, priority,
    attempts, max_attempts AS maxAttempts, run_after_ms AS runAfterMs,
    locked_at_ms AS lockedAtMs, worker, error, payload_json AS payloadJson,
    created_at AS createdAt, updated_at AS updatedAt, finished_at AS finishedAt
  FROM jobs
`;
