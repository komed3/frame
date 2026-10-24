import { assertRootId } from '@/src/server/api/middleware';
import { parseId, parsePagination } from '@/src/server/api/utils';
import { MediaDirectories } from '@/src/server/media/Directories';
import { Media } from '@/src/server/media/Media';
import type { MediaDirectory } from '@/src/shared/types/directories';
import { Router } from 'express';
import { basename } from 'node:path';


export const directories = Router();
directories.param( 'rootId', assertRootId );
