import { randomUUID } from 'node:crypto';
import { db } from './db';


type JobType =
  | 'scan' | 'poster' | 'scrubber' | 'image_preview'
  | 'text_preview' | 'audio_cover' | 'waveform';

interface MediaJob {
  id: number;
  media_id: number | null;
  job_type: JobType;
  attempts: number;
  max_attempts: number;
}

type JobProcessor = ( job: MediaJob ) => Promise< void >;


const workerId = randomUUID();
const idleDelayMs = 1000;
const errorDelayMs = 5000;
const retryDelayMs = 60_000;
const lockTimeoutMs = 30 * 60_000;

let running = false;
let stopped = false;


function recoverStaleJobs () : void {
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

function claimNextJob () : MediaJob | undefined {
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

    db.prepare( `
      UPDATE media_jobs
      SET status = 'running',
          attempts = attempts + 1,
          worker_id = ?,
          locked_at_ms = ?,
          updated_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )
      WHERE id = ? AND status = 'pending'
    ` ).run( workerId, now, job.id );

    db.exec( 'COMMIT' );

    return { ...job, attempts: job.attempts + 1 };
  } catch ( error ) {
    db.exec( 'ROLLBACK' );
    throw error;
  }
}

function completeJob ( jobId: number ) : void {
  db.prepare( `
    UPDATE media_jobs
    SET status = 'completed',
        worker_id = NULL,
        locked_at_ms = NULL,
        last_error = NULL,
        updated_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )
    WHERE id = ? AND worker_id = ?
  ` ).run( jobId, workerId );
}

function failJob ( job: MediaJob, error: unknown ) : void {
  const message = error instanceof Error ? error.message : String( error );
  const retry = job.attempts < job.max_attempts;

  db.prepare( `
    UPDATE media_jobs
    SET status = ?,
        available_at_ms = ?,
        worker_id = NULL,
        locked_at_ms = NULL,
        last_error = ?,
        updated_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )
    WHERE id = ? AND worker_id = ?
  ` ).run(
    retry ? 'pending' : 'failed',
    Date.now() + retryDelayMs * job.attempts,
    message.slice( 0, 2000 ), job.id, workerId
  );
}


export function enqueueMediaJob ( mediaId: number | null, jobType: JobType, priority = 0 ) : void {
  db.prepare( `
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
  ` ).run( mediaId, jobType, priority );
}


export async function runMediaJobs ( processJob: JobProcessor ) : Promise< void > {
  if ( running ) return;

  running = true;
  stopped = false;

  try {
    recoverStaleJobs();

    while ( ! stopped ) {
      let job: MediaJob | undefined;

      try { job = claimNextJob() }
      catch ( error ) {
        console.error( 'Failed to claim media job:', error );
        await new Promise( resolve => setTimeout( resolve, errorDelayMs ) );
        continue;
      }

      if ( ! job ) {
        await new Promise( resolve => setTimeout( resolve, idleDelayMs ) );
        continue;
      }

      try {
        await processJob( job );
        completeJob( job.id );
      } catch ( error ) {
        try { failJob( job, error ) }
        catch ( failure ) { console.error( `Failed to update media job ${ job.id }:`, failure ) }

        console.error( `Media job ${ job.id } failed:`, error );
      }
    }
  } finally {
    running = false;
  }
}


export function stopMediaJobs () : void { stopped = true }
