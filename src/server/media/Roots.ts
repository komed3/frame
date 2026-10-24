import { Config } from '@/src/server/core/Config';
import { as, conn } from '@/src/server/core/Database';
import { assertStringId, generateId } from '@/src/server/utils';
import type { MediaRoot, MediaRootRow } from '@/src/shared/types/roots';
import { realpathSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep, win32 } from 'node:path';


export class MediaRoots {
  private static canonicalize ( path: string ) : string {
    const canonicalPath = realpathSync( path );

    if ( ! statSync( canonicalPath ).isDirectory() )
      throw new Error( `Media root is not a directory: ${ canonicalPath }` );

    return canonicalPath;
  }

  private static isWithin ( root: string, target: string ) : boolean {
    const rel = relative( root, target );
    return rel === '' || ( rel !== '..' && ! rel.startsWith( `..${ sep }` ) && ! isAbsolute( rel ) );
  }

  private static getRow ( id: string ) : MediaRootRow {
    assertStringId( id, 'media root' );

    const row = as< MediaRootRow | undefined >( conn().prepare( `
      SELECT id, path, enabled, scan_generation AS scanGeneration,
        scanned_at AS scannedAt, created_at AS createdAt
      FROM roots WHERE id = ?
    ` ).get( id ) );

    if ( ! row ) throw new Error( `Media root ${ id } does not exist` );
    return row;
  }

  private static mapRow ( row: MediaRootRow ) : MediaRoot {
    return { ...row, enabled: row.enabled === 1 };
  }

  public static add ( path: string, enabled = true ) : string {
    const canonicalPath = MediaRoots.canonicalize( path );
    const id = generateId( Config.get( 'ID_LENGTH' ) );

    const row = as< { id: string } | undefined >( conn().prepare( `
      INSERT INTO roots ( id, path, enabled )
      VALUES ( ?, ?, ? )
      ON CONFLICT ( path ) DO UPDATE SET enabled = excluded.enabled
      RETURNING id
    ` ).get( id, canonicalPath, +!! enabled ) );

    if ( ! row ) throw new Error( `Could not register media root: ${ canonicalPath }` );
    return row.id;
  }

  public static list ( enabledOnly = false ) : MediaRoot[] {
    const rows = as< MediaRootRow[] >( conn().prepare( `
      SELECT
        id, path, enabled, scan_generation AS scanGeneration,
        scanned_at AS scannedAt, created_at AS createdAt
      FROM roots ${ enabledOnly ? 'WHERE enabled = 1' : '' }
      ORDER BY id
    ` ).all() );

    return rows.map( row => MediaRoots.mapRow( row ) );
  }

  public static setEnabled ( id: string, enabled: boolean ) : void {
    assertStringId( id, 'media root' );

    const result = conn().prepare( 'UPDATE roots SET enabled = ? WHERE id = ?' ).run( +!! enabled, id );
    if ( Number( result.changes ) !== 1 ) throw new Error( `Media root ${ id } does not exist` );
  }

  public static resolve ( id: string, relativePath: string ) : string {
    const root = MediaRoots.getRow( id );

    if ( ! root.enabled ) throw new Error( `Media root ${ id } is disabled` );
    if ( typeof relativePath !== 'string' || relativePath.includes( '\0' ) )
      throw new Error( 'Invalid media path' );

    if (
      isAbsolute( relativePath ) || win32.isAbsolute( relativePath ) ||
      relativePath.includes( '\\' ) || relativePath.split( '/' ).includes( '..' )
    ) throw new Error( `Path traversal is not allowed: ${ relativePath }` );

    const canonicalRoot = MediaRoots.canonicalize( root.path );
    if ( canonicalRoot !== root.path )
      throw new Error( `Media root path changed since registration: ${ root.path }` );

    const candidate = resolve( canonicalRoot, relativePath );
    if ( ! MediaRoots.isWithin( canonicalRoot, candidate ) )
      throw new Error( `Path is outside media root: ${ relativePath }` );

    const canonicalCandidate = realpathSync( candidate );
    if ( ! MediaRoots.isWithin( canonicalRoot, canonicalCandidate ) )
      throw new Error( `Path resolves outside media root: ${ relativePath }` );

    return canonicalCandidate;
  }
}
