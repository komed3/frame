import { usePlayHistory } from '@/src/client/hooks/usePlayHistory';
import type { MediaRecord } from '@/src/shared/types/media';


interface VideoPlayerProps {
  media: MediaRecord;
  playlistId?: string;
}


export function VideoPlayer ( { media, playlistId }: VideoPlayerProps ) {
  usePlayHistory( media );

  return (
    <>
      <div className= 'relative h-[calc(100vh-64px)] bg-slate-950 overflow-hidden'>
        <div className= 'absolute left-1/2 -translate-x-1/2 flex flex-col h-full'>
          <div className= 'flex-1 h-[calc(100%-48px)] aspect-video' />
          <div className= 'shrink-0 h-12' />
        </div>
      </div>
    </>
  );
}
