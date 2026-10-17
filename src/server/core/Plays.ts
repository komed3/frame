import { as, conn } from '@/src/server/core/Database';
import { Media } from '@/src/server/media/Media';
import { assertId, assertLimitOffset } from '@/src/server/utils';
import type { PlayRecord, PlayRow } from '@/src/shared/types/plays';


export class Plays {
  private static mapRow ( row: PlayRow ) : PlayRecord {
    return { ...row, completed: row.completed === 1 };
  }

  private static updateRow ( userId: number, playId: number, watchedMs: number, completed: boolean, finished: boolean ) : void {
    assertId( userId, 'user' );
    assertId( playId, 'play' );

    const result = conn().prepare( `
      UPDATE plays SET
        watched_ms = ?,
        completed = ?,
        ended_at = CASE
          WHEN ? = 1 THEN strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )
          ELSE ended_at
        END
      WHERE user_id = ? AND id = ?
    ` ).run( watchedMs, +!! completed, +finished, userId, playId );

    if ( Number( result.changes ) !== 1 ) throw new Error( `Play ${ playId } does not exist for user ${ userId }` );
  }

  public static listByUser ( userId: number, limit = 100, offset = 0 ) : PlayRecord[] {
    assertId( userId, 'user' );
    assertLimitOffset( limit, offset );

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

  public static listByMedia ( mediaId: number, limit = 100, offset = 0 ) : PlayRecord[] {
    Media.assertMediaIdSafe( mediaId );
    assertLimitOffset( limit, offset );

    const rows = as< PlayRow[] >( conn().prepare( `
      SELECT
        id, user_id AS userId, media_id AS mediaId, session_id AS sessionId,
        started_at AS startedAt, ended_at AS endedAt, watched_ms AS watchedMs,
        completed
      FROM plays
      WHERE media_id = ?
      ORDER BY started_at DESC, id DESC
      LIMIT ? OFFSET ?
    ` ).all( mediaId, limit, offset ) );

    return rows.map( row => Plays.mapRow( row ) );
  }

  public static listByUserAndMedia ( userId: number, mediaId: number, limit = 100, offset = 0 ) : PlayRecord[] {
    assertId( userId, 'user' );
    Media.assertMediaIdSafe( mediaId );
    assertLimitOffset( limit, offset );

    const rows = as< PlayRow[] >( conn().prepare( `
      SELECT
        id, user_id AS userId, media_id AS mediaId, session_id AS sessionId,
        started_at AS startedAt, ended_at AS endedAt, watched_ms AS watchedMs,
        completed
      FROM plays
      WHERE user_id = ? AND media_id = ?
      ORDER BY started_at DESC, id DESC
      LIMIT ? OFFSET ?
    ` ).all( userId, mediaId, limit, offset ) );

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

  public static start ( userId: number, mediaId: number, sessionId: number | null = null ) : number {
    assertId( userId, 'user' );
    Media.assertMediaIdSafe( mediaId );

    if ( sessionId !== null ) assertId( sessionId, 'session' );

    const result = conn().prepare(
      'INSERT INTO plays ( user_id, media_id, session_id ) VALUES ( ?, ?, ? )'
    ).run( userId, mediaId, sessionId );

    return Number( result.lastInsertRowid );
  }

  public static update ( userId: number, playId: number, watchedMs: number, completed = false ) : void {
    Plays.updateRow( userId, playId, watchedMs, completed, false );
  }

  public static finish ( userId: number, playId: number, watchedMs: number, completed = false ) : void {
    Plays.updateRow( userId, playId, watchedMs, completed, true );
  }

  public static delete ( userId: number, playId: number ) : boolean {
    assertId( userId, 'user' );
    assertId( playId, 'play' );

    const result = conn().prepare( 'DELETE FROM plays WHERE user_id = ? AND id = ?' ).run( userId, playId );
    return Number( result.changes ) > 0;
  }

  public static clear ( userId: number ) : number {
    assertId( userId, 'user' );

    const result = conn().prepare( 'DELETE FROM plays WHERE user_id = ?' ).run( userId );
    return Number( result.changes );
  }
}
