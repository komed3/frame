import { db } from '@/src/server/db';
import { envInteger } from '@/src/server/utils';
import type { MediaJob, MediaJobType } from '@/src/shared/types';


const permanentMediaError = /Invalid data found when processing input|moov atom not found|Invalid NAL unit|Error splitting the input into NAL units|Could not find codec parameters|(?:Unknown|Unsupported) decoder|Decoder .+ not found|does not contain any stream|matches no streams|Unsupported codec|Error while decoding|corrupt decoded frame|header damaged|Error parsing/i;
const retryDelayMs = envInteger( 'QUEUE_RETRY_DELAY_MS', 60_000, 1_000, 60 * 60_000 );
const lockTimeoutMs = envInteger( 'QUEUE_LOCK_TIMEOUT_MS', 30 * 60_000, 1_000, 90 * 60_000 );


function getErrorMessage ( err: unknown ) : string {
  if ( ! ( err instanceof Error ) ) return String( err );

  const stderr = ( err as Error & { stderr?: string | Buffer } ).stderr;
  return [ err.message, stderr?.toString() ].filter( Boolean ).join( '\n' );
}


export class JobQueue {
  public enqueue ( mediaId: number | null, jobType: MediaJobType, priority = 0, retryFailed = false ) : void {
    const retry = retryFailed ? 1 : 0;

    db.prepare( `
      INSERT INTO media_jobs ( media_id, job_type, priority )
      VALUES ( ?, ?, ? )
      ON CONFLICT DO UPDATE SET
        priority = MAX( media_jobs.priority, excluded.priority ),
        status = CASE
          WHEN media_jobs.status = 'completed' OR ( media_jobs.status = 'failed' AND ? = 1 ) THEN 'pending'
          ELSE media_jobs.status
        END,
        attempts = CASE
          WHEN media_jobs.status = 'completed' OR ( media_jobs.status = 'failed' AND ? = 1 ) THEN 0
          ELSE media_jobs.attempts
        END,
        available_at_ms = CASE
          WHEN media_jobs.status = 'completed' OR ( media_jobs.status = 'failed' AND ? = 1 ) THEN excluded.available_at_ms
          ELSE media_jobs.available_at_ms
        END,
        last_error = CASE
          WHEN media_jobs.status = 'completed' OR ( media_jobs.status = 'failed' AND ? = 1 ) THEN NULL
          ELSE media_jobs.last_error
        END,
        updated_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )
    ` ).run( mediaId, jobType, priority, retry, retry, retry, retry );
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
    const message = getErrorMessage( err );
    const permanent = permanentMediaError.test( message );
    const retry = ! permanent && job.attempts < job.max_attempts;

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

export const enqueueJob = ( mediaId: number | null, jobType: MediaJobType, priority = 0, retryFailed = false ) : void =>
  jobQueue.enqueue( mediaId, jobType, priority, retryFailed );
