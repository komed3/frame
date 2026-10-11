import { db } from '@/src/server/db';
import { processAssetJob } from '@/src/server/jobs/processors/assets';
import { processMetadataJob } from '@/src/server/jobs/processors/metadata';
import { processScanJob } from '@/src/server/jobs/processors/scan';
import { enqueueJob } from '@/src/server/jobs/queue';
import type { JobProcessor, MediaJob, MediaType } from '@/src/shared/types';


interface MediaAssetQueueRecord {
  id: number;
  media_type: MediaType;
  file_name: string;
  audio_codec: string | null;
  is_available: number;
}
