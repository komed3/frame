import { db } from '@/src/server/db';
import type { MediaJob, MediaJobType } from '@/src/shared/types';


const retryDelayMs = 60_000;
const lockTimeoutMs = 30 * 60_000;


export class JobQueue {
  public enqueue ( mediaId: number | null, jobType: MediaJobType, priority = 0 ) : void {
    db.prepare( `
      INSERT INTO media_jobs ( media_id, job_type, priority )
      VALUES ( ?, ?, ? )
      ON CONFLICT DO UPDATE SET
        priority = MAX( media_jobs.priority, excluded.priority ),
        status = CASE
          WHEN media_jobs.status IN ( 'completed', 'failed' ) THEN 'pending'
          ELSE media_jobs.status
        END,
        attempts = CASE
          WHEN media_jobs.status IN ( 'completed', 'failed' ) THEN 0
          ELSE media_jobs.attempts
        END,
        available_at_ms = CASE
          WHEN media_jobs.status IN ( 'completed', 'failed' ) THEN excluded.available_at_ms
          ELSE media_jobs.available_at_ms
        END,
        last_error = CASE
          WHEN media_jobs.status IN ( 'completed', 'failed' ) THEN NULL
          ELSE media_jobs.last_error
        END,
        updated_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )
    ` ).run( mediaId, jobType, priority );
  }

  public recoverStale () : void {
    db.prepare( `
      UPDATE media_jobs
      SET status = 'pending',
          worker_id = NULL,
          locked_at_ms = NULL,
          available_at_ms = ?,
          updated_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )
      WHERE status = 'running' AND locked_at_ms < ?
    ` ).run( Date.now(), Date.now() - lockTimeoutMs );
  }
}
