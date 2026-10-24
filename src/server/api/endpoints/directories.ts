import { assertRootId } from '@/src/server/api/middleware';
import { parseId, parsePagination } from '@/src/server/api/utils';
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
  const directoryId = value === undefined ? null : parseId( String( value ) );
  const pagination = parsePagination( req.query.limit, req.query.offset );

  if ( value !== undefined && directoryId === null )
    return res.status( 400 ).json( { error: 'Invalid directory ID' } );

  const current = directoryId === null ? null : MediaDirectories.get( directoryId );
  if ( current && current.rootId !== root.id ) return res.status( 404 ).json( { error: 'Directory not found' } );
  if ( directoryId !== null && ! current ) return res.status( 404 ).json( { error: 'Directory not found' } );

  const trail: Pick< MediaDirectory, 'id' | 'name' | 'path' >[] = [];
  let parent = current;

  while ( parent ) {
    trail.push( { id: parent.id, name: parent.name, path: parent.path } );
    parent = parent.parentId === null ? null : MediaDirectories.get( parent.parentId );

    if ( parent && parent.rootId !== root.id )
      return res.status( 404 ).json( { error: 'Directory not found' } );
  }

  res.json( {
    root: { id: root.id, name: basename( root.path ) || root.path }, current,
    breadcrumbs: [ { id: null, name: basename( root.path ) || root.path, path: '' }, ...trail.reverse() ],
    directories: MediaDirectories.list( root.id, directoryId ), media: Media.list( {
      rootId: root.id, directoryId, availableOnly: true, ...pagination
    } ), ...pagination
  } );
} );
