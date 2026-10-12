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

  public claim ( workerId: string ) : MediaJob | undefined {
    const now = Date.now();
    db.exec( 'BEGIN IMMEDIATE' );

    try {
      const job = db.prepare( `
        SELECT id, media_id, job_type, attempts, max_attempts
        FROM media_jobs
        WHERE status = 'pending'
          AND available_at_ms <= ?
          AND attempts < max_attempts
        ORDER BY priority DESC, available_at_ms, id
        LIMIT 1
      ` ).get( now ) as MediaJob | undefined;

      if ( ! job ) { db.exec( 'COMMIT' ); return }

      const result = db.prepare( `
        UPDATE media_jobs
        SET status = 'running',
            attempts = attempts + 1,
            worker_id = ?,
            locked_at_ms = ?,
            updated_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )
        WHERE id = ? AND status = 'pending'
      ` ).run( workerId, now, job.id );

      if ( result.changes !== 1 ) throw new Error( `Could not claim job ${ job.id }` );

      db.exec( 'COMMIT' );
      return { ...job, attempts: job.attempts + 1 };
    } catch ( err ) {
      db.exec( 'ROLLBACK' );
      throw err;
    }
  }

  public complete ( job: MediaJob, workerId: string ) : void {
    const result = db.prepare( `
      UPDATE media_jobs
      SET status = 'completed',
          worker_id = NULL,
          locked_at_ms = NULL,
          last_error = NULL,
          updated_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )
      WHERE id = ? AND status = 'running' AND worker_id = ?
    ` ).run( job.id, workerId );

    if ( result.changes !== 1 ) throw new Error( `Could not complete job ${ job.id }` );
  }

  public fail ( job: MediaJob, workerId: string, err: unknown ) : void {
    const message = err instanceof Error ? err.message : String( err );
    const retry = job.attempts < job.max_attempts;

    const result = db.prepare( `
      UPDATE media_jobs
      SET status = ?,
          available_at_ms = ?,
          worker_id = NULL,
          locked_at_ms = NULL,
          last_error = ?,
          updated_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )
      WHERE id = ? AND status = 'running' AND worker_id = ?
    ` ).run(
      retry ? 'pending' : 'failed', Date.now() + retryDelayMs * job.attempts,
      message.slice( 0, 2000 ), job.id, workerId
    );

    if ( result.changes !== 1 ) throw new Error( `Could not update failed job ${ job.id }` );
  }
}


export const jobQueue = new JobQueue();

export const enqueueJob = ( mediaId: number | null, jobType: MediaJobType, priority = 0 ) : void =>
  jobQueue.enqueue( mediaId, jobType, priority );
