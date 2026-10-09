import { randomUUID } from 'node:crypto';

import { db } from '@/src/server/db';


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
