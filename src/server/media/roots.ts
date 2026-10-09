import { realpathSync, statSync } from 'node:fs';
import { db } from '../db';


export interface MediaRoot {
  id: number;
  path: string;
}


export function addMediaRoot ( path: string ) : number {
  const rootPath = realpathSync( path );

  if ( ! statSync( rootPath ).isDirectory() ) throw new Error( `Media root is not a directory: ${ rootPath }` );

  const root = db.prepare( `
    INSERT INTO media_roots ( path, enabled )
    VALUES ( ?, 1 )
    ON CONFLICT ( path ) DO UPDATE SET enabled = 1
    RETURNING id
  ` ).get( rootPath ) as { id: number } | undefined;

  if ( ! root ) throw new Error( `Failed to register media root: ${ rootPath }` );
  return root.id;
}


export function getEnabledMediaRoots () : MediaRoot[] {
  return db.prepare( `
    SELECT id, path
    FROM media_roots
    WHERE enabled = 1
    ORDER BY id
  ` ).all() as unknown as MediaRoot[];
}


export function setMediaRootEnabled ( id: number, enabled: boolean ) : void {
  db.prepare( `
    UPDATE media_roots
    SET enabled = ?
    WHERE id = ?
  ` ).run( enabled ? 1 : 0, id );
}
