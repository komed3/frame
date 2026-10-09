import { db } from '../db';


export type JobType =
  | 'scan' | 'poster' | 'scrubber' | 'image_preview'
  | 'text_preview' | 'audio_cover' | 'waveform';

export interface MediaJob {
  id: number;
  media_id: number | null;
  job_type: JobType;
  attempts: number;
  max_attempts: number;
}


const retryDelayMs = 60_000;
const lockTimeoutMs = 30 * 60_000;


export function enqueueJob ( mediaId: number | null, jobType: JobType, priority = 0 ) : void {
  const sql = mediaId === null ? `
    INSERT INTO media_jobs ( media_id, job_type, priority )
    VALUES ( NULL, ?, ? )
    ON CONFLICT ( job_type ) WHERE media_id IS NULL DO UPDATE SET
      priority = MAX( media_jobs.priority, excluded.priority ),
      status = CASE
        WHEN media_jobs.status = 'failed' THEN 'pending'
        ELSE media_jobs.status
      END,
      available_at_ms = CASE
        WHEN media_jobs.status = 'failed' THEN excluded.available_at_ms
        ELSE media_jobs.available_at_ms
      END,
      updated_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )
  ` : `
    INSERT INTO media_jobs ( media_id, job_type, priority )
    VALUES ( ?, ?, ? )
    ON CONFLICT ( media_id, job_type ) DO UPDATE SET
      priority = MAX( media_jobs.priority, excluded.priority ),
      status = CASE
        WHEN media_jobs.status = 'failed' THEN 'pending'
        ELSE media_jobs.status
      END,
      available_at_ms = CASE
        WHEN media_jobs.status = 'failed' THEN excluded.available_at_ms
        ELSE media_jobs.available_at_ms
      END,
      updated_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )
  `;

  if ( mediaId === null ) db.prepare( sql ).run( jobType, priority );
  else db.prepare( sql ).run( mediaId, jobType, priority );
}


export function recoverStaleJobs () : void {
  db.prepare( `
    UPDATE media_jobs
    SET status = 'pending',
        worker_id = NULL,
        locked_at_ms = NULL,
        available_at_ms = ?,
        updated_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )
    WHERE status = 'running'
      AND locked_at_ms < ?
  ` ).run( Date.now(), Date.now() - lockTimeoutMs );
}


export function claimNextJob ( workerId: string ) : MediaJob | undefined {
  const now = Date.now();
  db.exec( 'BEGIN IMMEDIATE' );

  try {
    const job = db.prepare( `
      SELECT id, media_id, job_type, attempts, max_attempts
      FROM media_jobs
      WHERE status = 'pending'
        AND available_at_ms <= ?
        AND attempts < max_attempts
      ORDER BY priority DESC, available_at_ms ASC, id ASC
      LIMIT 1
    ` ).get( now ) as MediaJob | undefined;

    if ( ! job ) {
      db.exec( 'COMMIT' );
      return undefined;
    }

    const result = db.prepare( `
      UPDATE media_jobs
      SET status = 'running',
          attempts = attempts + 1,
          worker_id = ?,
          locked_at_ms = ?,
          updated_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )
      WHERE id = ? AND status = 'pending'
    ` ).run( workerId, now, job.id );

    if ( result.changes !== 1 ) throw new Error( `Failed to claim media job ${ job.id }` );
    db.exec( 'COMMIT' );

    return { ...job, attempts: job.attempts + 1 };
  } catch ( error ) {
    db.exec( 'ROLLBACK' );
    throw error;
  }
}


export function completeJob ( jobId: number, workerId: string ) : void {
  const result = db.prepare( `
    UPDATE media_jobs
    SET status = 'completed',
        worker_id = NULL,
        locked_at_ms = NULL,
        last_error = NULL,
        updated_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )
    WHERE id = ? AND status = 'running' AND worker_id = ?
  ` ).run( jobId, workerId );

  if ( result.changes !== 1 ) throw new Error( `Failed to complete media job ${ jobId }` );
}


export function failJob ( job: MediaJob, workerId: string, error: unknown ) : void {
  const message = error instanceof Error ? error.message : String( error );
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
    retry ? 'pending' : 'failed',
    Date.now() + retryDelayMs * job.attempts,
    message.slice( 0, 2000 ), job.id, workerId
  );

  if ( result.changes !== 1 ) throw new Error( `Failed to update media job ${ job.id }` );
}
