import { ApiContextValue } from '@/src/shared/types/api';
import { MediaRecord } from '@/src/shared/types/media';


export function adjacentMedia ( api: ApiContextValue, media: MediaRecord, playlistId?: string ) {
  const { media: mediaApi, playlists } = api;

  const adjacent = ( dir: 'prev' | 'next' ) => playlistId
    ? playlists[ dir ]( playlistId, media.id ).then( i => i?.mediaId ?? null )
    : mediaApi[ dir ]( media.id ).then( i => i?.id ?? null );

  return [ adjacent( 'prev' ), adjacent( 'next' ) ];
}
