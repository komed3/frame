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

  public static get ( userId: number, playlistId: number ) : PlaylistRecord | null {
    Playlists.assertOwned( userId, playlistId );

    const row = as< PlaylistRecord | undefined >( conn().prepare( `
      SELECT
        id, user_id AS userId, name, description,
        created_at AS createdAt, updated_at AS updatedAt
      FROM playlists
      WHERE id = ? AND user_id = ?
    ` ).get( playlistId, userId ) );

    return row ?? null;
  }

  public static list ( userId: number, limit = 100, offset = 0 ) : PlaylistRecord[] {
    assertId( userId, 'user' );
    assertLimitOffset( limit, offset );

    return as< PlaylistRecord[] >( conn().prepare( `
      SELECT
        id, user_id AS userId, name, description,
        created_at AS createdAt, updated_at AS updatedAt
      FROM playlists
      WHERE user_id = ?
      ORDER BY updated_at DESC, id DESC
      LIMIT ? OFFSET ?
    ` ).all( userId, limit, offset ) );
  }
}
