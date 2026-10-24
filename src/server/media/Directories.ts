import { Config } from '@/src/server/core/Config';
import { as, conn, db } from '@/src/server/core/Database';
import { assertRelativePath, assertStringId, generateId } from '@/src/server/utils';
import type {
  MediaDirectory, MediaDirectoryEntry, MediaDirectoryRow,
  MediaDirectoryTree
} from '@/src/shared/types/directories';


export class MediaDirectories {
  private static mapRow ( row: MediaDirectoryRow ) : MediaDirectory {
    return {
      id: row.id, rootId: row.rootId, parentId: row.parentId, path: row.path,
      name: row.name, scannedAt: row.scannedAt, createdAt: row.createdAt
    };
  }

  private static assertGeneration ( rootId: string, scanGeneration: number ) : void {
    const root = as< { scanGeneration: number } | undefined >( conn().prepare(
      'SELECT scan_generation AS scanGeneration FROM roots WHERE id = ?'
    ).get( rootId ) );

    if ( ! root ) throw new Error( `Media root ${ rootId } does not exist` );
    if ( root.scanGeneration !== scanGeneration ) throw new Error(
      `Scan generation ${ scanGeneration } is no longer active for media root ${ rootId }`
    );
  }

  public static get ( id: string ) : MediaDirectory | null {
    assertStringId( id, 'media directory' );

    const row = as< MediaDirectoryRow | undefined >( conn().prepare( `
      SELECT
        id, root_id AS rootId, parent_id AS parentId, path, name,
        scan_generation AS scanGeneration, scanned_at AS scannedAt, created_at AS createdAt
      FROM directories
      WHERE id = ?
    ` ).get( id ) );

    return row ? MediaDirectories.mapRow( row ) : null;
  }

  public static getByPath ( rootId: string, path: string ) : MediaDirectory | null {
    assertStringId( rootId, 'media root' );
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

  public static list ( rootId: string, parentId: string | null = null ) : MediaDirectoryEntry[] {
    assertStringId( rootId, 'media root' );
    if ( parentId !== null ) assertStringId( parentId, 'media directory' );

    return as< MediaDirectoryEntry[] >( conn().prepare( `
      SELECT
        d.id, d.root_id AS rootId, d.parent_id AS parentId, d.path, d.name,
        d.scanned_at AS scannedAt, d.created_at AS createdAt,
        COUNT( m.id ) AS mediaCount
      FROM directories d
      LEFT JOIN media m ON m.directory_id = d.id
      WHERE d.root_id = ? AND d.parent_id IS ?
      GROUP BY d.id
      ORDER BY d.name COLLATE NOCASE, d.id
    ` ).all( rootId, parentId ) );
  }

  public static tree ( rootId: string ) : MediaDirectoryTree[] {
    assertStringId( rootId, 'media root' );

    const rows = as< MediaDirectoryEntry[] >( conn().prepare( `
      SELECT
        d.id, d.root_id AS rootId, d.parent_id AS parentId, d.path, d.name,
        d.scanned_at AS scannedAt, d.created_at AS createdAt,
        COUNT( m.id ) AS mediaCount
      FROM directories d
      LEFT JOIN media m ON m.directory_id = d.id
      WHERE d.root_id = ?
      GROUP BY d.id
      ORDER BY d.path COLLATE NOCASE, d.id
    ` ).all( rootId ) );

    const nodes = new Map< string, MediaDirectoryTree >();
    const tree: MediaDirectoryTree[] = [];

    for ( const row of rows ) nodes.set( row.id, { ...row, children: [] } );

    for ( const node of nodes.values() ) {
      const parent = node.parentId === null ? undefined : nodes.get( node.parentId );

      if ( parent ) parent.children.push( node );
      else tree.push( node );
    }

    return tree;
  }

  public static beginScan ( rootId: string ) : number {
    assertStringId( rootId, 'media root' );

    const row = as< { scanGeneration: number } | undefined >( conn().prepare( `
      UPDATE roots
      SET scan_generation = scan_generation + 1
      WHERE id = ?
      RETURNING scan_generation AS scanGeneration
    ` ).get( rootId ) );

    if ( ! row ) throw new Error( `Media root ${ rootId } does not exist` );
    return row.scanGeneration;
  }

  public static register ( rootId: string, path: string, scanGeneration: number ) : string {
    assertStringId( rootId, 'media root' );

    if ( ! Number.isSafeInteger( scanGeneration ) || scanGeneration < 0 )
      throw new Error( `Invalid scan generation: ${ scanGeneration }` );

    assertRelativePath( path, 'directory' );

    return db.transaction( tx => {
      MediaDirectories.assertGeneration( rootId, scanGeneration );

      const separator = path.lastIndexOf( '/' );
      const parentPath = separator < 0 ? null : path.slice( 0, separator );
      const name = separator < 0 ? path : path.slice( separator + 1 );
      let parentId: string | null = null;

      if ( parentPath !== null ) {
        const parent = as< { id: string } | undefined >( tx.prepare(
          'SELECT id FROM directories WHERE root_id = ? AND path = ? AND scan_generation = ?'
        ).get( rootId, parentPath, scanGeneration ) );

        if ( ! parent ) throw new Error( `Parent directory must be registered before ${ path }` );
        parentId = parent.id;
      }

      const id = generateId( Config.get( 'ID_LENGTH' ) );
      const row = as< { id: string } | undefined >( tx.prepare( `
        INSERT INTO directories ( id, root_id, parent_id, path, name, scan_generation, scanned_at )
        VALUES ( ?, ?, ?, ?, ?, ?, strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ) )
        ON CONFLICT ( root_id, path ) DO UPDATE SET
          parent_id = excluded.parent_id,
          name = excluded.name,
          scan_generation = excluded.scan_generation,
          scanned_at = excluded.scanned_at
        RETURNING id
      ` ).get( id, rootId, parentId, path, name, scanGeneration ) );

      if ( ! row ) throw new Error( `Could not register media directory: ${ path }` );
      return row.id;
    } );
  }

  public static finishScan ( rootId: string, scanGeneration: number ) : void {
    assertStringId( rootId, 'media root' );

    if ( ! Number.isSafeInteger( scanGeneration ) || scanGeneration < 0 )
      throw new Error( `Invalid scan generation: ${ scanGeneration }` );

    db.transaction( tx => {
      MediaDirectories.assertGeneration( rootId, scanGeneration );

      tx.prepare( `
        WITH RECURSIVE stale ( id ) AS (
          SELECT id
          FROM directories
          WHERE root_id = ? AND scan_generation <> ?

          UNION

          SELECT d.id
          FROM directories d
          JOIN stale s ON d.parent_id = s.id
          WHERE d.root_id = ?
        )
        UPDATE media
        SET directory_id = NULL
        WHERE root_id = ? AND directory_id IN ( SELECT id FROM stale )
      ` ).run( rootId, scanGeneration, rootId, rootId );

      tx.prepare( 'DELETE FROM directories WHERE root_id = ? AND scan_generation <> ?' ).run( rootId, scanGeneration );

      const result = tx.prepare( `
        UPDATE roots
        SET scanned_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )
        WHERE id = ? AND scan_generation = ?
      ` ).run( rootId, scanGeneration );

      if ( Number( result.changes ) !== 1 ) throw new Error(
        `Scan generation ${ scanGeneration } is no longer active for media root ${ rootId }`
      );
    } );
  }
}
