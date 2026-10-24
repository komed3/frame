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
