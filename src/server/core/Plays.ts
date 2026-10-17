import { as, conn } from '@/src/server/core/Database';
import { Media } from '@/src/server/media/Media';
import { assertId } from '@/src/server/utils';
import type { PlayRecord, PlayRow } from '@/src/shared/types/plays';


export class Plays {
  private static mapRow ( row: PlayRow ) : PlayRecord {
    return { ...row, completed: row.completed === 1 };
  }

  public static list ( userId: number, limit = 100, offset = 0 ) : PlayRecord[] {
    assertId( userId, 'user' );

    if ( ! Number.isSafeInteger( limit ) || limit < 1 ) throw new Error( `Invalid plays limit: ${ limit }` );
    if ( ! Number.isSafeInteger( offset ) || offset < 0 ) throw new Error( `Invalid plays offset: ${ offset }` );

    const rows = as< PlayRow[] >( conn().prepare( `
      SELECT
        id, user_id AS userId, media_id AS mediaId, session_id AS sessionId,
        started_at AS startedAt, ended_at AS endedAt, watched_ms AS watchedMs,
        completed
      FROM plays
      WHERE user_id = ?
      ORDER BY started_at DESC, id DESC
      LIMIT ? OFFSET ?
    ` ).all( userId, limit, offset ) );

    return rows.map( row => Plays.mapRow( row ) );
  }

  public static get ( userId: number, playId: number ) : PlayRecord | null {
    assertId( userId, 'user' );
    assertId( playId, 'play' );

    const row = as< PlayRow | undefined >( conn().prepare( `
      SELECT
        id, user_id AS userId, media_id AS mediaId, session_id AS sessionId,
        started_at AS startedAt, ended_at AS endedAt, watched_ms AS watchedMs,
        completed
      FROM plays
      WHERE user_id = ? AND id = ?
    ` ).get( userId, playId ) );

    return row ? Plays.mapRow( row ) : null;
  }
}
