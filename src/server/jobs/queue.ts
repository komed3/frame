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
