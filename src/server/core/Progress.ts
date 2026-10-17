import { as, conn } from '@/src/server/core/Database';
import { Media } from '@/src/server/media/Media';
import { assertId } from '@/src/server/utils';
import type { ProgressRecord, ProgressRow } from '@/src/shared/types/progress';


export class Progress {
  private static mapRow ( row: ProgressRow ) : ProgressRecord {
    return { ...row, completed: row.completed === 1 };
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
}
