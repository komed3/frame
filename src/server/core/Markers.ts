import { as, conn } from '@/src/server/core/Database';
import { Media } from '@/src/server/media/Media';
import { assertId, assertLimitOffset } from '@/src/server/utils';
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
}
