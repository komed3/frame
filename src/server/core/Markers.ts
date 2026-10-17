import { as, conn } from '@/src/server/core/Database';
import { Media } from '@/src/server/media/Media';
import { assertId, assertLimitOffset, normalizeOptionalString, normalizeString } from '@/src/server/utils';
import type { MarkerRecord, MarkerUpdate } from '@/src/shared/types/markers';


export class Markers {
  public static get ( userId: number, markerId: number ) : MarkerRecord | null {
    assertId( userId, 'user' );
    assertId( markerId, 'marker' );

    const row = as< MarkerRecord | undefined >( conn().prepare( `
      SELECT
        id, user_id AS userId, media_id AS mediaId, position_ms AS positionMs,
        title, description, created_at AS createdAt
      FROM markers
      WHERE user_id = ? AND id = ?
    ` ).get( userId, markerId ) );

    return row ?? null;
  }

  public static list ( userId: number, limit = 100, offset = 0 ) : MarkerRecord[] {
    assertId( userId, 'user' );
    assertLimitOffset( limit, offset );

    return as< MarkerRecord[] >( conn().prepare( `
      SELECT
        id, user_id AS userId, media_id AS mediaId, position_ms AS positionMs,
        title, description, created_at AS createdAt
      FROM markers
      WHERE user_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ? OFFSET ?
    ` ).all( userId, limit, offset ) );
  }

  public static mediaMarker ( userId: number, mediaId: number, limit = 100, offset = 0 ) : MarkerRecord[] {
    assertId( userId, 'user' );
    Media.assertMediaIdSafe( mediaId );
    assertLimitOffset( limit, offset );

    return as< MarkerRecord[] >( conn().prepare( `
      SELECT
        id, user_id AS userId, media_id AS mediaId, position_ms AS positionMs,
        title, description, created_at AS createdAt
      FROM markers
      WHERE user_id = ? AND media_id = ?
      ORDER BY position_ms, id
      LIMIT ? OFFSET ?
    ` ).all( userId, mediaId, limit, offset ) );
  }

  public static create (
    userId: number, mediaId: number, positionMs: number,
    title: string | null = null, description: string | null = null
  ) : number {
    assertId( userId, 'user' );
    Media.assertMediaIdSafe( mediaId );

    if ( ! Number.isSafeInteger( positionMs ) || positionMs < 0 )
      throw new Error( `Invalid marker position: ${ positionMs }` );

    const result = conn().prepare( `
      INSERT INTO markers ( user_id, media_id, position_ms, title, description )
      VALUES ( ?, ?, ?, ?, ? )
    ` ).run(
      userId, mediaId, positionMs,
      normalizeOptionalString( title, 'Marker title' ),
      normalizeOptionalString( description, 'Marker description' )
    );

    return Number( result.lastInsertRowid );
  }

  public static update ( userId: number, markerId: number, patch: MarkerUpdate ) : void {
    assertId( userId, 'user' );
    assertId( markerId, 'marker' );

    const assignments: string[] = [], values: ( number | string | null )[] = [];

    if ( patch.positionMs !== undefined ) {
      if ( ! Number.isSafeInteger( patch.positionMs ) || patch.positionMs < 0 )
        throw new Error( `Invalid marker position: ${ patch.positionMs }` );

      assignments.push( 'position_ms = ?' );
      values.push( patch.positionMs );
    }

    if ( patch.title !== undefined ) {
      assignments.push( 'title = ?' );
      values.push( normalizeString( patch.title, 'Marker title' ) );
    }

    if ( patch.description !== undefined ) {
      assignments.push( 'description = ?' );
      values.push( normalizeString( patch.description, 'Marker description' ) );
    }

    if ( ! assignments.length ) return;

    const result = conn().prepare( `
      UPDATE markers
      SET ${ assignments.join( ', ' ) }
      WHERE user_id = ? AND id = ?
    ` ).run( ...values, userId, markerId );

    if ( Number( result.changes ) !== 1 )
      throw new Error( `Marker ${ markerId } does not exist for user ${ userId }` );
  }

  public static delete ( userId: number, markerId: number ) : boolean {
    assertId( userId, 'user' );
    assertId( markerId, 'marker' );

    const result = conn().prepare( 'DELETE FROM markers WHERE user_id = ? AND id = ?' ).run( userId, markerId );
    return Number( result.changes ) > 0;
  }
}
