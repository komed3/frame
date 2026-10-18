import { as, conn, db } from '@/src/server/core/Database';
import { assertId, assertRelativePath } from '@/src/server/utils';
import type { MediaDirectory, MediaDirectoryEntry, MediaDirectoryRow } from '@/src/shared/types/directories';


export class MediaDirectories {
  private static mapRow ( row: MediaDirectoryRow ) : MediaDirectory {
    return {
      id: row.id, rootId: row.rootId, parentId: row.parentId, path: row.path,
      name: row.name, scannedAt: row.scannedAt, createdAt: row.createdAt
    };
  }

  private static assertGeneration ( rootId: number, scanGeneration: number ) : void {
    const root = as< { scanGeneration: number } | undefined >( conn().prepare(
      'SELECT scan_generation AS scanGeneration FROM roots WHERE id = ?'
    ).get( rootId ) );

    if ( ! root ) throw new Error( `Media root ${ rootId } does not exist` );
    if ( root.scanGeneration !== scanGeneration ) throw new Error(
      `Scan generation ${ scanGeneration } is no longer active for media root ${ rootId }`
    );
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

  public static beginScan ( rootId: number ) : number {
    assertId( rootId, 'media root' );

    const row = as< { scanGeneration: number } | undefined >( conn().prepare( `
      UPDATE roots
      SET scan_generation = scan_generation + 1
      WHERE id = ?
      RETURNING scan_generation AS scanGeneration
    ` ).get( rootId ) );

    if ( ! row ) throw new Error( `Media root ${ rootId } does not exist` );
    return row.scanGeneration;
  }

  public static register ( rootId: number, path: string, scanGeneration: number ) : number {
    assertId( rootId, 'media root' );
    assertId( scanGeneration, 'scan generation' );
    assertRelativePath( path, 'directory' );
    MediaDirectories.assertGeneration( rootId, scanGeneration );

    const separator = path.lastIndexOf( '/' );
    const parentPath = separator < 0 ? null : path.slice( 0, separator );
    const name = separator < 0 ? path : path.slice( separator + 1 );
    let parentId: number | null = null;

    if ( parentPath !== null ) {
      const parent = as< { id: number } | undefined >( conn().prepare(
        'SELECT id FROM directories WHERE root_id = ? AND path = ? AND scan_generation = ?'
      ).get( rootId, parentPath, scanGeneration ) );

      if ( ! parent ) throw new Error( `Parent directory must be registered before ${ path }` );
      parentId = parent.id;
    }

    const row = as< { id: number } | undefined >( conn().prepare( `
      INSERT INTO directories ( root_id, parent_id, path, name, scan_generation, scanned_at )
      VALUES ( ?, ?, ?, ?, ?, strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ) )
      ON CONFLICT ( root_id, path ) DO UPDATE SET
        parent_id = excluded.parent_id,
        name = excluded.name,
        scan_generation = excluded.scan_generation,
        scanned_at = excluded.scanned_at
      RETURNING id
    ` ).get( rootId, parentId, path, name, scanGeneration ) );

    if ( ! row ) throw new Error( `Could not register media directory: ${ path }` );
    return row.id;
  }

  public static finishScan ( rootId: number, scanGeneration: number ) : void {
    assertId( rootId, 'media root' );
    assertId( scanGeneration, 'scan generation' );
    MediaDirectories.assertGeneration( rootId, scanGeneration );

    db.transaction( tx => {
      tx.prepare( 'DELETE FROM directories WHERE root_id = ? AND scan_generation <> ?' ).run( rootId, scanGeneration );
      tx.prepare( `UPDATE roots SET scanned_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ) WHERE id = ?` ).run( rootId );
    } );
  }
}
