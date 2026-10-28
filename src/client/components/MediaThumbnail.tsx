import { MediaIcon } from '@/src/client/components/MediaIcon';
import { useApi } from '@/src/client/context/ApiContext';
import type { MediaRecord } from '@/src/shared/types/media';
import { useState } from 'react';


interface MediaThumbnailProps {
  media: MediaRecord;
  aspectRatio?: string;
}


export function MediaThumbnail ( { media, aspectRatio = 'aspect-video' }: MediaThumbnailProps ) {
  const { assets } = useApi();
  const [ failedUrl, setFailedUrl ] = useState< string | null >( null );

  const url = [ 'video', 'audio', 'image' ].includes( media.type ) && assets.url( media.id, 'thumb', 'default' );

  return (
    <div className= { 'flex justify-center items-center overflow-hidden bg-slate-50/10 rounded ' + aspectRatio }>
      { url && failedUrl !== url ? (
        <img
          src= { url }
          className= 'w-full h-full object-cover'
          alt= { media.title ?? '' }
          loading= 'lazy'
          onError= { () => setFailedUrl( url ) }
        />
      ) : (
        <MediaIcon type= { media.type } size= { 26 } strokeWidth= { 1.4 } />
      ) }
    </div>
  );
}
