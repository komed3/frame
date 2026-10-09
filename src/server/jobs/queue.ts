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
