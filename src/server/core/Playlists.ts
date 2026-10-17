import { as, conn, db } from '@/src/server/core/Database';
import { Media } from '@/src/server/media/Media';
import { assertId, assertLimitOffset, normalizeString } from '@/src/server/utils';
import type { PlaylistItemRecord, PlaylistRecord, PlaylistUpdate } from '@/src/shared/types/playlists';


const ITEM_SELECT = ( dir: 'ASC' | 'DESC' ) : string => `
  SELECT playlist_id AS playlistId, media_id AS mediaId, position, added_at AS addedAt
  FROM playlist_items
  WHERE playlist_id = ? AND position > (
    SELECT position FROM playlist_items WHERE playlist_id = ? AND media_id = ?
  )
  ORDER BY position ${ dir }, media_id ${ dir }
  LIMIT 1
`;


export class Playlists {
  private static assertOwned ( userId: number, playlistId: number ) : void {
    assertId( userId, 'user' );
    assertId( playlistId, 'playlist' );

    if ( ! conn().prepare( 'SELECT 1 FROM playlists WHERE id = ? AND user_id = ?' ).get( playlistId, userId ) )
      throw new Error( `Playlist ${ playlistId } does not exist for user ${ userId }` );
  }

  private static touch ( playlistId: number ) : void {
    conn().prepare( `
      UPDATE playlists
      SET updated_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )
      WHERE id = ?
    ` ).run( playlistId );
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

  public static nextItem ( userId: number, playlistId: number, mediaId: number ) : PlaylistItemRecord | null {
    Playlists.assertOwned( userId, playlistId );
    Media.assertMediaIdSafe( mediaId );

    return as< PlaylistItemRecord | undefined >(
      conn().prepare( ITEM_SELECT( 'ASC' ) ).get( playlistId, playlistId, mediaId )
    ) ?? null;
  }

  public static prevItem ( userId: number, playlistId: number, mediaId: number ) : PlaylistItemRecord | null {
    Playlists.assertOwned( userId, playlistId );
    Media.assertMediaIdSafe( mediaId );

    return as< PlaylistItemRecord | undefined >(
      conn().prepare( ITEM_SELECT( 'DESC' ) ).get( playlistId, playlistId, mediaId )
    ) ?? null;
  }

  public static addItem ( userId: number, playlistId: number, mediaId: number ) : void {
    Playlists.assertOwned( userId, playlistId );
    Media.assertMediaIdSafe( mediaId );

    conn().prepare( `
      INSERT INTO playlist_items ( playlist_id, media_id, position )
      VALUES ( ?, ?, (
        SELECT COALESCE( MAX( position ) + 1, 0 )
        FROM playlist_items WHERE playlist_id = ?
      ) )
    ` ).run( playlistId, mediaId, playlistId );

    Playlists.touch( playlistId );
  }

  public static removeItem ( userId: number, playlistId: number, mediaId: number ) : boolean {
    Playlists.assertOwned( userId, playlistId );
    Media.assertMediaIdSafe( mediaId );

    const result = conn().prepare(
      'DELETE FROM playlist_items WHERE playlist_id = ? AND media_id = ?'
    ).run( playlistId, mediaId );

    if ( Number( result.changes ) > 0 ) Playlists.touch( playlistId );
    return Number( result.changes ) > 0;
  }

  public static moveItem ( userId: number, playlistId: number, mediaId: number, position: number ) : void {
    Playlists.assertOwned( userId, playlistId );
    Media.assertMediaIdSafe( mediaId );

    if ( ! Number.isSafeInteger( position ) || position < 0 )
      throw new Error( `Invalid playlist position: ${ position }` );

    db.transaction( tx => {
      const items = as< { mediaId: number; position: number }[] >( tx.prepare( `
        SELECT media_id AS mediaId, position
        FROM playlist_items
        WHERE playlist_id = ?
        ORDER BY position, media_id
      ` ).all( playlistId ) );

      const currentIndex = items.findIndex( item => item.mediaId === mediaId );

      if ( currentIndex < 0 ) throw new Error( `Media ${ mediaId } does not exist in playlist ${ playlistId }` );
      if ( position >= items.length ) throw new Error( `Invalid playlist position: ${ position }` );
      if ( currentIndex === position ) return;

      const [ item ] = items.splice( currentIndex, 1 );
      items.splice( position, 0, item );

      const maxPosition = items.reduce( ( max, item ) => Math.max( max, item.position ), 0 );
      const updatePosition = tx.prepare(
        'UPDATE playlist_items SET position = ? WHERE playlist_id = ? AND media_id = ?'
      );

      items.forEach( ( item, index ) => updatePosition.run(
        maxPosition + items.length + index + 1, playlistId, item.mediaId
      ) );

      items.forEach( ( item, index ) => updatePosition.run( index, playlistId, item.mediaId ) );

      tx.prepare( `
        UPDATE playlists
        SET updated_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )
        WHERE id = ?
      ` ).run( playlistId );
    } );
  }

  public static clearItems ( userId: number, playlistId: number ) : number {
    Playlists.assertOwned( userId, playlistId );

    const result = conn().prepare( 'DELETE FROM playlist_items WHERE playlist_id = ?' ).run( playlistId );

    if ( Number( result.changes ) > 0 ) Playlists.touch( playlistId );
    return Number( result.changes );
  }
}
