import { as, conn, db } from '@/src/server/core/Database';
import { User } from '@/src/server/core/User';
import { Media } from '@/src/server/media/Media';
import { assertId, assertLimitOffset } from '@/src/server/utils';
import type { PlayRecord, PlayRow } from '@/src/shared/types/plays';


export class Plays {
  private static mapRow ( row: PlayRow ) : PlayRecord {
    return { ...row, completed: row.completed === 1 };
  }

  private static updateRow ( userId: string, playId: string, watchedMs: number, completed: boolean, finished: boolean ) : void {
    User.assertUserIdSafe( userId );
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

  private static list ( where: string, params: ( string | number | null )[], limit: number, offset: number ) : PlayRecord[] {
    assertLimitOffset( limit, offset );

    const rows = as< PlayRow[] >( conn().prepare( `
      SELECT
        id, user_id AS userId, media_id AS mediaId, session_id AS sessionId,
        started_at AS startedAt, ended_at AS endedAt, watched_ms AS watchedMs,
        completed
      FROM plays
      WHERE ${ where }
      ORDER BY started_at DESC, id DESC
      LIMIT ? OFFSET ?
    ` ).all( ...params, limit, offset ) );

    return rows.map( row => Plays.mapRow( row ) );
  }

  public static listByUser ( userId: string, limit = 100, offset = 0 ) : PlayRecord[] {
    User.assertUserIdSafe( userId );
    return Plays.list( 'user_id = ?', [ userId ], limit, offset );
  }

  public static listByMedia ( mediaId: string, limit = 100, offset = 0 ) : PlayRecord[] {
    Media.assertMediaIdSafe( mediaId );
    return Plays.list( 'media_id = ?', [ mediaId ], limit, offset );
  }

  public static listByUserAndMedia ( userId: string, mediaId: string, limit = 100, offset = 0 ) : PlayRecord[] {
    User.assertUserIdSafe( userId );
    Media.assertMediaIdSafe( mediaId );

    return Plays.list( 'user_id = ? AND media_id = ?', [ userId, mediaId ], limit, offset );
  }

  public static get ( userId: string, playId: string ) : PlayRecord | null {
    User.assertUserIdSafe( userId );
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

  public static start ( userId: string, mediaId: string, sessionId: string | null = null ) : string {
    User.assertUserIdSafe( userId );
    Media.assertMediaIdSafe( mediaId );

    if ( sessionId !== null ) assertId( sessionId, 'session' );

    return db.createWithId( id => {
      conn().prepare(
        'INSERT INTO plays ( id, user_id, media_id, session_id ) VALUES ( ?, ?, ?, ? )'
      ).run( id, userId, mediaId, sessionId );

      return id;
    } );
  }

  public static update ( userId: string, playId: string, watchedMs: number, completed = false ) : void {
    Plays.updateRow( userId, playId, watchedMs, completed, false );
  }

  public static finish ( userId: string, playId: string, watchedMs: number, completed = false ) : void {
    Plays.updateRow( userId, playId, watchedMs, completed, true );
  }

  public static delete ( userId: string, playId: string ) : boolean {
    User.assertUserIdSafe( userId );
    assertId( playId, 'play' );

    const result = conn().prepare( 'DELETE FROM plays WHERE user_id = ? AND id = ?' ).run( userId, playId );
    return Number( result.changes ) > 0;
  }

  public static clear ( userId: string ) : number {
    User.assertUserIdSafe( userId );

    const result = conn().prepare( 'DELETE FROM plays WHERE user_id = ?' ).run( userId );
    return Number( result.changes );
  }
}
