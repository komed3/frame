import { db } from '@/src/server/db';
import type { MediaRoot } from '@/src/shared/types';
import { realpathSync, statSync } from 'node:fs';


export class MediaRootRepo {
  public add ( path: string ) : number {
    const canonicalPath = realpathSync( path );

    if ( ! statSync( canonicalPath ).isDirectory() )
      throw new Error( `Media root is not a directory: ${ canonicalPath }` );

    const row = db.prepare( `
      INSERT INTO media_roots ( path, enabled )
      VALUES ( ?, 1 )
      ON CONFLICT ( path ) DO UPDATE SET enabled = 1
      RETURNING id
    ` ).get( canonicalPath ) as { id: number } | undefined;

    if ( ! row ) throw new Error( `Could not register media root: ${ canonicalPath }` );
    return row.id;
  }
}
