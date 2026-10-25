import { as, conn, db } from '@/src/server/core/Database';
import { Media } from '@/src/server/media/Media';
import { assertId, assertLimitOffset, normalizeOptionalString } from '@/src/server/utils';
import type { MarkerRecord, MarkerUpdate } from '@/src/shared/types/markers';


export class Markers {
  public static get ( userId: string, markerId: string ) : MarkerRecord | null {
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

  public static list ( userId: string, limit = 100, offset = 0 ) : MarkerRecord[] {
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

  public static mediaMarker ( userId: string, mediaId: string, limit = 100, offset = 0 ) : MarkerRecord[] {
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
    userId: string, mediaId: string, positionMs: number,
    title: string | null = null, description: string | null = null
  ) : string {
    assertId( userId, 'user' );
    Media.assertMediaIdSafe( mediaId );

    if ( ! Number.isSafeInteger( positionMs ) || positionMs < 0 )
      throw new Error( `Invalid marker position: ${ positionMs }` );

    return db.createWithId( id => {
      conn().prepare( `
        INSERT INTO markers ( id, user_id, media_id, position_ms, title, description )
        VALUES ( ?, ?, ?, ?, ?, ? )
      ` ).run(
        id, userId, mediaId, positionMs,
        normalizeOptionalString( title, 'Marker title' ),
        normalizeOptionalString( description, 'Marker description' )
      );

      return id;
    } );
  }

  public static update ( userId: string, markerId: string, patch: MarkerUpdate ) : void {
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
      values.push( normalizeOptionalString( patch.title, 'Marker title' ) );
    }

    if ( patch.description !== undefined ) {
      assignments.push( 'description = ?' );
      values.push( normalizeOptionalString( patch.description, 'Marker description' ) );
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

  public static delete ( userId: string, markerId: string ) : boolean {
    assertId( userId, 'user' );
    assertId( markerId, 'marker' );

    const result = conn().prepare( 'DELETE FROM markers WHERE user_id = ? AND id = ?' ).run( userId, markerId );
    return Number( result.changes ) > 0;
  }

  public static clearMediaMarker ( userId: string, mediaId: string ) : number {
    assertId( userId, 'user' );
    Media.assertMediaIdSafe( mediaId );

    const result = conn().prepare( 'DELETE FROM markers WHERE user_id = ? AND media_id = ?' ).run( userId, mediaId );
    return Number( result.changes );
  }

  public static clear ( userId: string ) : number {
    assertId( userId, 'user' );

    const result = conn().prepare( 'DELETE FROM markers WHERE user_id = ?' ).run( userId );
    return Number( result.changes );
  }
}
