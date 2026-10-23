import { parseId } from '@/src/server/api/utils';
import { Media } from '@/src/server/media/Media';
import { MediaDirectories } from '@/src/server/media/Directories';
import { MediaRoots } from '@/src/server/media/Roots';
import type { MediaDirectory } from '@/src/shared/types/directories';
import { Router } from 'express';
import { basename } from 'node:path';


export const directories = Router();


directories.param( 'rootId', ( _, res, next, value ) => {
  const id = parseId( value );
  if ( id === null ) return res.status( 400 ).json( { error: 'Invalid root ID' } );

  const root = MediaRoots.list().find( root => root.id === id );
  if ( ! root ) return res.status( 404 ).json( { error: 'Root not found' } );
  if ( ! root.enabled ) return res.status( 409 ).json( { error: 'Root is disabled' } );

  res.locals.root = root;
  next();
} );
