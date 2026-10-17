import { as, conn } from '@/src/server/core/Database';
import { Media } from '@/src/server/media/Media';
import { assertId, assertLimitOffset } from '@/src/server/utils';
import type { FavoriteRecord } from '@/src/shared/types/favorites';


export class Favorites {
  public static has ( userId: number, mediaId: number ) : boolean {
    assertId( userId, 'user' );
    Media.assertMediaIdSafe( mediaId );

    return !! conn().prepare( 'SELECT 1 FROM favorites WHERE user_id = ? AND media_id = ?' ).get( userId, mediaId );
  }

  public static list ( userId: number, limit = 100, offset = 0 ) : FavoriteRecord[] {
    assertId( userId, 'user' );
    assertLimitOffset( limit, offset );

    return as< FavoriteRecord[] >( conn().prepare( `
      SELECT user_id AS userId, media_id AS mediaId, created_at AS createdAt
      FROM favorites
      WHERE user_id = ?
      ORDER BY created_at DESC, media_id
      LIMIT ? OFFSET ?
    ` ).all( userId, limit, offset ) );
  }

  public static add ( userId: number, mediaId: number ) : boolean {
    assertId( userId, 'user' );
    Media.assertMediaIdSafe( mediaId );

    const result = conn().prepare( `
      INSERT INTO favorites ( user_id, media_id )
      VALUES ( ?, ? )
      ON CONFLICT ( user_id, media_id ) DO NOTHING
    ` ).run( userId, mediaId );

    return Number( result.changes ) > 0;
  }

  public static remove ( userId: number, mediaId: number ) : boolean {
    assertId( userId, 'user' );
    Media.assertMediaIdSafe( mediaId );

    const result = conn().prepare( 'DELETE FROM favorites WHERE user_id = ? AND media_id = ?' ).run( userId, mediaId );
    return Number( result.changes ) > 0;
  }

  public static clear ( userId: number ) : number {
    assertId( userId, 'user' );

    const result = conn().prepare( 'DELETE FROM favorites WHERE user_id = ?' ).run( userId );
    return Number( result.changes );
  }
}
