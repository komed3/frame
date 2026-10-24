import { parsePagination } from '@/src/server/api/utils';
import { MediaDirectories } from '@/src/server/media/Directories';
import { Media } from '@/src/server/media/Media';
import { MediaRoots } from '@/src/server/media/Roots';
import type { MediaDirectory } from '@/src/shared/types/directories';
import { Router } from 'express';
import { basename } from 'node:path';


export const directories = Router();


directories.get( '/:rootId/tree', ( req, res ) => {
  const root = MediaRoots.list().find( item => item.id === req.params.rootId );

  res.json( {
    root: { id: root?.id, name: root ? basename( root.path ) || root.path : undefined },
    tree: MediaDirectories.tree( req.params.rootId )
  } );
} );

directories.get( '/:rootId', ( req, res ) => {
  const rootId = req.params.rootId, value = req.query.directoryId;
  const directoryId = value === undefined ? null : String( value );
  const pagination = parsePagination( req.query.limit, req.query.offset );

  const current = directoryId === null ? null : MediaDirectories.get( directoryId );

  const trail: Pick< MediaDirectory, 'id' | 'name' | 'path' >[] = [];
  let parent = current;

  while ( parent ) {
    trail.push( { id: parent.id, name: parent.name, path: parent.path } );
    parent = parent.parentId === null ? null : MediaDirectories.get( parent.parentId );
  }

  const root = MediaRoots.list().find( item => item.id === rootId );
  const rootName = root ? basename( root.path ) || root.path : undefined;

  res.json( {
    root: { id: rootId, name: rootName }, current, ...pagination,
    breadcrumbs: [ { id: null, name: rootName, path: '' }, ...trail.reverse() ],
    directories: MediaDirectories.list( rootId, directoryId ),
    media: Media.list( { rootId, directoryId, availableOnly: true, ...pagination } )
  } );
} );
