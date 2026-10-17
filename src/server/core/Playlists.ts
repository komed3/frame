import { as, conn, db } from '@/src/server/core/Database';
import { Media } from '@/src/server/media/Media';
import { assertId, assertLimitOffset, normalizeString } from '@/src/server/utils';
import type { PlaylistItemRecord, PlaylistRecord, PlaylistUpdate } from '@/src/shared/types/playlists';


export class Playlists {
  private static assertOwned ( userId: number, playlistId: number ) : void {
    assertId( userId, 'user' );
    assertId( playlistId, 'playlist' );

    if ( ! conn().prepare( 'SELECT 1 FROM playlists WHERE id = ? AND user_id = ?' ).get( playlistId, userId ) )
      throw new Error( `Playlist ${ playlistId } does not exist for user ${ userId }` );
  }
}
