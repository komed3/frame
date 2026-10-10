import { db } from '../../db';
import { enqueueJob } from '../queue';
import type { JobProcessor } from '../worker';
import { processImagePreviewJob, processPosterJob, processScrubberJob, processWaveformJob } from './assets';
import { processMetadataJob } from './metadata';
import { processScanJob } from './scan';


interface MediaAssetSource {
  id: number;
  media_type: 'video' | 'audio' | 'image' | 'text' | 'other';
  file_name: string;
  audio_codec: string | null;
  is_available: number;
}


function enqueueMediaAssets ( mediaId: number ) : void {
  const media = db.prepare( `
    SELECT id, media_type, file_name, audio_codec, is_available
    FROM media
    WHERE id = ?
  ` ).get( mediaId ) as MediaAssetSource | undefined;

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


export const processMediaJob: JobProcessor = async job => {
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
