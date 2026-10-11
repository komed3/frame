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


export class MediaJobProcessor {
  private enqueueMediaAssets ( mediaId: number ) : void {
    const media = db.prepare( `
      SELECT id, media_type, file_name, audio_codec, is_available
      FROM media
      WHERE id = ?
    ` ).get( mediaId ) as MediaAssetQueueRecord | undefined;

    if ( ! media || ! media.is_available ) return;

    if ( media.media_type === 'video' ) {
      enqueueJob( media.id, 'poster', 8 );
      enqueueJob( media.id, 'frames', 1 );

      if ( media.audio_codec ) enqueueJob( media.id, 'wave', 3 );
    } else if ( media.media_type === 'audio' ) {
      enqueueJob( media.id, 'thumb', 5 );
      if ( media.audio_codec ) enqueueJob( media.id, 'wave', 3 );
    } else if ( media.media_type === 'image' && ! media.file_name.toLowerCase().endsWith( '.svg' ) ) {
      enqueueJob( media.id, 'thumb', 5 );
    } else if ( media.media_type === 'text' ) {
      enqueueJob( media.id, 'text', 2 );
    }
  }

  public async process ( job: MediaJob ) : Promise< void > {
    switch ( job.job_type ) {
      case 'scan': return await processScanJob( job );

      case 'metadata':
        await processMetadataJob( job );
        if ( job.media_id !== null ) this.enqueueMediaAssets( job.media_id );
        return;

      case 'poster': case 'thumb': case 'frames': case 'wave': case 'text':
        return await processAssetJob( job );

      default: throw new Error( `Unsupported media job type: ${ job.job_type }` );
    }
  }
}
