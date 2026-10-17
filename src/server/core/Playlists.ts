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

  public static create ( userId: number, name: string, description?: string ) : number {
    assertId( userId, 'user' );

    const desc = description ? normalizeString( description, 'Playlist description' ) : null;
    const result = conn().prepare(
      'INSERT INTO playlists ( user_id, name, description ) VALUES ( ?, ?, ? )'
    ).run( userId, normalizeString( name, 'Playlist name' ), desc );

    return Number( result.lastInsertRowid );
  }

  public static update ( userId: number, playlistId: number, patch: PlaylistUpdate ) : void {
    Playlists.assertOwned( userId, playlistId );

    const assignments: string[] = [], values: ( string | null )[] = [];

    if ( patch.name !== undefined ) {
      assignments.push( 'name = ?' );
      values.push( normalizeString( patch.name, 'Playlist name' ) );
    }

    if ( patch.description !== undefined ) {
      assignments.push( 'description = ?' );
      values.push( normalizeString( patch.description, 'Playlist description' ) );
    }

    if ( ! assignments.length ) return;
    assignments.push( `updated_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )` );

    const result = conn().prepare( `
      UPDATE playlists
      SET ${ assignments.join( ', ' ) }
      WHERE id = ? AND user_id = ?
    ` ).run( ...values, playlistId, userId );

    if ( Number( result.changes ) !== 1 )
      throw new Error( `Playlist ${ playlistId } does not exist for user ${ userId }` );
  }

  public static delete ( userId: number, playlistId: number ) : boolean {
    Playlists.assertOwned( userId, playlistId );

    const result = conn().prepare( 'DELETE FROM playlists WHERE id = ? AND user_id = ?' ).run( playlistId, userId );
    return Number( result.changes ) > 0;
  }

  public static listItems ( userId: number, playlistId: number, limit = 100, offset = 0 ) : PlaylistItemRecord[] {
    Playlists.assertOwned( userId, playlistId );
    assertLimitOffset( limit, offset );

    return as< PlaylistItemRecord[] >( conn().prepare( `
      SELECT playlist_id AS playlistId, media_id AS mediaId, position, added_at AS addedAt
      FROM playlist_items
      WHERE playlist_id = ?
      ORDER BY position, media_id
      LIMIT ? OFFSET ?
    ` ).all( playlistId, limit, offset ) );
  }
}
