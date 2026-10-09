import { db } from '../db';


export type JobType =
  | 'scan' | 'poster' | 'scrubber' | 'image_preview'
  | 'text_preview' | 'audio_cover' | 'waveform';
