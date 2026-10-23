import { parseId } from '@/src/server/api/utils';
import { Media } from '@/src/server/media/Media';
import { MediaDirectories } from '@/src/server/media/Directories';
import { MediaRoots } from '@/src/server/media/Roots';
import type { MediaDirectory } from '@/src/shared/types/directories';
import { Router } from 'express';
import { basename } from 'node:path';


export const directories = Router();
