import { usePlayHistory } from '@/src/client/hooks/usePlayHistory';
import type { MediaRecord } from '@/src/shared/types/media';


interface VideoPlayerProps {
  media: MediaRecord;
  playlistId?: string;
}


export function VideoPlayer ( { media, playlistId }: VideoPlayerProps ) {
  usePlayHistory( media );

  return (
    <></>
  );
}
