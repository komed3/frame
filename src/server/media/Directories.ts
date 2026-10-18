import { as, conn, db } from '@/src/server/core/Database';
import { assertId, assertRelativePath } from '@/src/server/utils';
import type { MediaDirectory, MediaDirectoryEntry, MediaDirectoryRow } from '@/src/shared/types/directories';


export class MediaDirectories {
  private static mapRow ( row: MediaDirectoryRow ) : MediaDirectory {
    const { scanGeneration, ...directory } = row;
    return directory;
  }

  public static get ( id: number ) : MediaDirectory | null {
    assertId( id, 'media directory' );

    const row = as< MediaDirectoryRow | undefined >( conn().prepare( `
      SELECT
        id, root_id AS rootId, parent_id AS parentId, path, name,
        scan_generation AS scanGeneration, scanned_at AS scannedAt, created_at AS createdAt
      FROM directories
      WHERE id = ?
    ` ).get( id ) );

    return row ? MediaDirectories.mapRow( row ) : null;
  }
}
