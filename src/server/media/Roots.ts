import { as, conn, db, type Database } from '@/src/server/core/Database';
import type { MediaRoot, MediaRootRow } from '@/src/shared/types/media';
import { realpathSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep, win32 } from 'node:path';


export class MediaRoots {
  private canonicalize ( path: string ) : string {
    const canonicalPath = realpathSync( path );

    if ( ! statSync( canonicalPath ).isDirectory() )
      throw new Error( `Media root is not a directory: ${ canonicalPath }` );

    return canonicalPath;
  }

  private isWithin ( root: string, target: string ) : boolean {
    const rel = relative( root, target );
    return rel === '' || ( rel !== '..' && ! rel.startsWith( `..${ sep }` ) && ! isAbsolute( rel ) );
  }

  private getRow ( id: number ) : MediaRootRow {
    if ( ! Number.isSafeInteger( id ) || id < 1 ) throw new Error( `Invalid media root ID: ${ id }` );

    const row = as< MediaRootRow | undefined >( conn().prepare( `
      SELECT id, path, enabled, scanned_at AS scannedAt, created_at AS createdAt
      FROM roots WHERE id = ?
    ` ).get( id ) );

    if ( ! row ) throw new Error( `Media root ${ id } does not exist` );
    return row;
  }

  private mapRow ( row: MediaRootRow ) : MediaRoot {
    return { ...row, enabled: row.enabled === 1 };
  }

  public add ( path: string, enabled = true ) : number {
    const canonicalPath = this.canonicalize( path );
    const row = as< { id: number } | undefined >( conn().prepare( `
      INSERT INTO roots ( path, enabled )
      VALUES ( ?, ? )
      ON CONFLICT ( path ) DO UPDATE SET enabled = 1
      RETURNING id
    ` ).get( canonicalPath, +!! enabled ) );

    if ( ! row ) throw new Error( `Could not register media root: ${ canonicalPath }` );
    return row.id;
  }

  public list ( enabledOnly = false ) : MediaRoot[] {
    const rows = as< MediaRootRow[] >( conn().prepare( `
      SELECT id, path, enabled, scanned_at AS scannedAt, created_at AS createdAt
      FROM roots ${ enabledOnly ? 'WHERE enabled = 1' : '' } ORDER BY id
    ` ).all() );

    return rows.map( row => this.mapRow( row ) );
  }
}


export const mediaRoots = new MediaRoots();
