import { db } from '@/src/server/db';
import type { MediaRoot } from '@/src/shared/types';
import { realpathSync, statSync } from 'node:fs';


export class MediaRoots {
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

  public list ( enabledOnly = false ) : MediaRoot[] {
    return db.prepare( `
      SELECT id, path
      FROM media_roots
      ${ enabledOnly ? 'WHERE enabled = 1' : '' }
      ORDER BY id
    ` ).all() as unknown as MediaRoot[];
  }

  public setEnabled ( id: number, enabled: boolean ) : void {
    const result = db.prepare( 'UPDATE media_roots SET enabled = ? WHERE id = ?' ).run( enabled ? 1 : 0, id );
    if ( result.changes !== 1 ) throw new Error( `Media root ${ id } does not exist` );
  }
}


export const mediaRoots = new MediaRoots();
