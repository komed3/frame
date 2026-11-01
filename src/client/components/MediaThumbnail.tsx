import { MediaIcon } from '@/src/client/components/MediaIcon';
import { useApi } from '@/src/client/context/ApiContext';
import type { MediaRecord } from '@/src/shared/types/media';
import type { ProgressRecord } from '@/src/shared/types/progress';
import { useState } from 'react';


interface MediaThumbnailProps {
  media: MediaRecord;
  progress?: ProgressRecord;
  aspectRatio?: string;
}


export function MediaThumbnail ( { media, progress, aspectRatio = 'aspect-video' }: MediaThumbnailProps ) {
  const { assets } = useApi();
  const [ failedUrl, setFailedUrl ] = useState< string | null >( null );

  const url = media.hasThumbnail && [ 'video', 'audio', 'image' ].includes( media.type ) &&
    assets.url( media.id, 'thumb', 'default' );

  const percentage = progress?.completed ? 100 : progress && media.durationMs ?
    Math.max( 0, Math.min( 100, progress.positionMs / media.durationMs * 100 ) ) : 0;

  const showProgress = !! progress && ( progress.completed || progress.positionMs > 0 ) &&
    ( progress.completed || !! media.durationMs );

  return (
    <div className= { 'relative flex justify-center items-center overflow-hidden bg-slate-50/5 rounded ' + aspectRatio }>
      { url && failedUrl !== url ? (
        <img
          src= { url }
          className= 'size-full object-cover pointer-events-none'
          alt= { media.title ?? '' }
          loading= 'lazy'
          onError= { () => setFailedUrl( url ) }
        />
      ) : (
        <MediaIcon
          type= { media.type }
          size= { 36 }
          strokeWidth= { 0.6 }
          className= 'opacity-25'
        />
      ) }

      { showProgress && (
        <div className= 'absolute inset-x-0 bottom-0 h-1 bg-slate-950/60'>
          <div
            className= 'h-full bg-sky-500'
            style= { { width: `${ percentage }%` } }
          />
        </div>
      ) }
    </div>
  );
}
