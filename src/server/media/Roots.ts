import { as, db, type Database } from '@/src/server/core/Database';
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
}


export const mediaRoots = new MediaRoots();
