import { useApi } from '@/src/client/context/ApiContext';
import { MediaRecord } from '@/src/shared/types/media';


export function adjacentMedia ( media: MediaRecord, dir: 'prev' | 'next', playlistId?: string ) : Promise< string | null > {
  const { media: mediaApi, playlists } = useApi();

  return playlistId ? playlists[ dir ]( playlistId, media.id ).then( i => i?.mediaId ?? null ) :
    mediaApi[ dir ]( media.id ).then( i => i?.id ?? null );
}
