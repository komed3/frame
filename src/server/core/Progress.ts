import { as, conn } from '@/src/server/core/Database';
import { Media } from '@/src/server/media/Media';
import { assertId } from '@/src/server/utils';
import type { ProgressRecord, ProgressRow } from '@/src/shared/types/progress';


export class Progress {
  private static mapRow ( row: ProgressRow ) : ProgressRecord {
    return { ...row, completed: row.completed === 1 };
  }

  public static list ( userId: number, limit = 100, offset = 0 ) : ProgressRecord[] {
    assertId( userId, 'user' );

    if ( ! Number.isSafeInteger( limit ) || limit < 1 ) throw new Error( `Invalid progress limit: ${ limit }` );
    if ( ! Number.isSafeInteger( offset ) || offset < 0 ) throw new Error( `Invalid progress offset: ${ offset }` );

    const rows = as< ProgressRow[] >( conn().prepare( `
      SELECT
        user_id AS userId, media_id AS mediaId, position_ms AS positionMs,
        completed, updated_at AS updatedAt
      FROM progress
      WHERE user_id = ?
      ORDER BY updated_at DESC, media_id
      LIMIT ? OFFSET ?
    ` ).all( userId, limit, offset ) );

    return rows.map( row => Progress.mapRow( row ) );
  }

  public static get ( userId: number, mediaId: number ) : ProgressRecord | null {
    assertId( userId, 'user' );
    Media.assertMediaIdSafe( mediaId );

    const row = as< ProgressRow | undefined >( conn().prepare( `
      SELECT
        user_id AS userId, media_id AS mediaId, position_ms AS positionMs,
        completed, updated_at AS updatedAt
      FROM progress
      WHERE user_id = ? AND media_id = ?
    ` ).get( userId, mediaId ) );

    return row ? Progress.mapRow( row ) : null;
  }

  public static save ( userId: number, mediaId: number, positionMs: number, completed = false ) : ProgressRecord {
    assertId( userId, 'user' );
    Media.assertMediaIdSafe( mediaId );

    const row = as< ProgressRow | undefined >( conn().prepare( `
      INSERT INTO progress ( user_id, media_id, position_ms, completed )
      VALUES ( ?, ?, ?, ? )
      ON CONFLICT ( user_id, media_id ) DO UPDATE SET
        position_ms = excluded.position_ms,
        completed = excluded.completed,
        updated_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )
      RETURNING
        user_id AS userId, media_id AS mediaId, position_ms AS positionMs,
        completed, updated_at AS updatedAt
    ` ).get( userId, mediaId, positionMs, +!! completed ) );

    if ( ! row ) throw new Error( `Could not save progress for media ${ mediaId }` );
    return Progress.mapRow( row );
  }

  public static delete ( userId: number, mediaId: number ) : boolean {
    assertId( userId, 'user' );
    Media.assertMediaIdSafe( mediaId );

    const result = conn().prepare( 'DELETE FROM progress WHERE user_id = ? AND media_id = ?' ).run( userId, mediaId );
    return Number( result.changes ) > 0;
  }

  public static clear ( userId: number ) : number {
    assertId( userId, 'user' );

    const result = conn().prepare( 'DELETE FROM progress WHERE user_id = ?' ).run( userId );
    return Number( result.changes );
  }
}
