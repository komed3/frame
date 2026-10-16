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
}


export const mediaRoots = new MediaRoots();
