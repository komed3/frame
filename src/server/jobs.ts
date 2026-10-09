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
