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

  public static getByPath ( rootId: number, path: string ) : MediaDirectory | null {
    assertId( rootId, 'media root' );
    assertRelativePath( path, 'directory' );

    const row = as< MediaDirectoryRow | undefined >( conn().prepare( `
      SELECT
        id, root_id AS rootId, parent_id AS parentId, path, name,
        scan_generation AS scanGeneration, scanned_at AS scannedAt, created_at AS createdAt
      FROM directories
      WHERE root_id = ? AND path = ?
    ` ).get( rootId, path ) );

    return row ? MediaDirectories.mapRow( row ) : null;
  }

  public static list ( rootId: number, parentId: number | null = null ) : MediaDirectoryEntry[] {
    assertId( rootId, 'media root' );
    if ( parentId !== null ) assertId( parentId, 'media directory' );

    return as< MediaDirectoryEntry[] >( conn().prepare( `
      WITH RECURSIVE tree ( id, top_id ) AS (
        SELECT id, id
        FROM directories
        WHERE root_id = ? AND parent_id IS ?

        UNION ALL

        SELECT d.id, tree.top_id
        FROM directories d
        JOIN tree ON d.parent_id = tree.id
        WHERE d.root_id = ?
      ),
      counts AS (
        SELECT tree.top_id AS directoryId, COUNT( m.id ) AS mediaCount
        FROM tree
        LEFT JOIN media m ON m.directory_id = tree.id
        GROUP BY tree.top_id
      )
      SELECT
        d.id, d.root_id AS rootId, d.parent_id AS parentId, d.path, d.name,
        d.scanned_at AS scannedAt, d.created_at AS createdAt,
        COALESCE( counts.mediaCount, 0 ) AS mediaCount
      FROM directories d
      LEFT JOIN counts ON counts.directoryId = d.id
      WHERE d.root_id = ? AND d.parent_id IS ?
      ORDER BY d.name COLLATE NOCASE, d.id
    ` ).all( rootId, parentId, rootId, rootId, parentId ) );
  }
}
