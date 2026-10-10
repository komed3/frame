import type { JobProcessor, MediaAssetQueueRecord, MediaJob } from '@/shared/types';
import { db } from '@/src/server/db';
import {
  processImagePreviewJob, processPosterJob, processScrubberJob, processWaveformJob
} from '@/src/server/jobs/processors/assets';
import { processMetadataJob } from '@/src/server/jobs/processors/metadata';
import { processScanJob } from '@/src/server/jobs/processors/scan';
import { enqueueJob } from '@/src/server/jobs/queue';


function enqueueMediaAssets ( mediaId: number ) : void {
  const media = db.prepare( `
    SELECT id, media_type, file_name, audio_codec, is_available
    FROM media
    WHERE id = ?
  ` ).get( mediaId ) as MediaAssetQueueRecord | undefined;

  if ( ! media || ! media.is_available ) return;

  if ( media.media_type === 'video' ) {
    enqueueJob( media.id, 'poster', 5 );
    enqueueJob( media.id, 'scrubber', 5 );
    if ( media.audio_codec ) enqueueJob( media.id, 'waveform', 5 );
  } else if ( media.media_type === 'audio' ) {
    if ( media.audio_codec ) enqueueJob( media.id, 'waveform', 5 );
  } else if (
    media.media_type === 'image' &&
    ! media.file_name.toLowerCase().endsWith( '.svg' )
  ) enqueueJob( media.id, 'image_preview', 5 );
}


export const processMediaJob: JobProcessor = async ( job: MediaJob ) => {
  switch ( job.job_type ) {
    case 'scan': return await processScanJob( job );

    case 'metadata':
      await processMetadataJob( job );
      if ( job.media_id !== null ) enqueueMediaAssets( job.media_id );
      return;

    case 'poster': return await processPosterJob( job );
    case 'scrubber': return await processScrubberJob( job );
    case 'image_preview': return await processImagePreviewJob( job );
    case 'waveform': return await processWaveformJob( job );

    default: throw new Error( `Unsupported media job type: ${ job.job_type }` );
  }
};
