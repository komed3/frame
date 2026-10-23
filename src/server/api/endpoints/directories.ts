import { assertRootId } from '@/src/server/api/middleware';
import { parseId } from '@/src/server/api/utils';
import { MediaDirectories } from '@/src/server/media/Directories';
import { Media } from '@/src/server/media/Media';
import type { MediaDirectory } from '@/src/shared/types/directories';
import { Router } from 'express';
import { basename } from 'node:path';


export const directories = Router();
directories.param( 'rootId', assertRootId );


directories.get( '/:rootId/tree', ( _, res ) => {
  const root = res.locals.root;

  res.json( {
    root: { id: root.id, name: basename( root.path ) || root.path },
    tree: MediaDirectories.tree( root.id )
  } );
} );

directories.get( '/:rootId', ( req, res ) => {
  const root = res.locals.root, value = req.query.directoryId;

  if ( value !== undefined && typeof value !== 'string' )
    return res.status( 400 ).json( { error: 'Invalid directory ID' } );

  const directoryId = value === undefined ? null : parseId( value );
  if ( value !== undefined && directoryId === null )
    return res.status( 400 ).json( { error: 'Invalid directory ID' } );

  const current = directoryId === null ? null : MediaDirectories.get( directoryId );
  if ( directoryId !== null && ( ! current || current.rootId !== root.id ) )
    return res.status( 404 ).json( { error: 'Directory not found' } );

  const trail: Pick< MediaDirectory, 'id' | 'name' | 'path' >[] = [];
  let parent = current;

  while ( parent ) {
    trail.push( { id: parent.id, name: parent.name, path: parent.path } );

    parent = parent.parentId === null ? null : MediaDirectories.get( parent.parentId );
    if ( parent && parent.rootId !== root.id ) return res.status( 404 ).json( { error: 'Directory not found' } );
  }

  const limit = Number( req.query.limit ?? 100 );
  const offset = Number( req.query.offset ?? 0 );

  if ( ! Number.isSafeInteger( limit ) || limit < 1 || limit > 500 || ! Number.isSafeInteger( offset ) || offset < 0 )
    return res.status( 400 ).json( { error: 'Invalid pagination options' } );

  res.json( {
    root: { id: root.id, name: basename( root.path ) || root.path }, current,
    breadcrumbs: [ { id: null, name: basename( root.path ) || root.path, path: '' }, ...trail.reverse() ],
    directories: MediaDirectories.list( root.id, directoryId ),
    media: Media.list( { rootId: root.id, directoryId, availableOnly: true, limit, offset } ),
    limit, offset
  } );
} );
