import { randomUUID } from 'node:crypto';

import { db } from '@/src/server/db';


type JobType =
  | 'scan' | 'poster' | 'scrubber' | 'image_preview'
  | 'text_preview' | 'audio_cover' | 'waveform';
