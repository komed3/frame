import { MediaActions } from '@/src/client/components/MediaActions';
import type { MediaRecord } from '@/src/shared/types/media';


interface AudioPlayerProps {
  media: MediaRecord;
  playlistId?: string;
}


export function AudioPlayer ( { media, playlistId }: AudioPlayerProps ) {
  return (
    <div className= 'mx-auto my-8 max-w-7xl px-6 space-y-10'>
      <div className= 'relative w-full max-h-130 aspect-2/1 bg-slate-950 rounded' />

      <MediaActions media= { media } />
    </div>
  );
}
