import { as, db, type Database } from '@/src/server/core/Database';
import { realpathSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep, win32 } from 'node:path';


export class MediaRoots {}


export const mediaRoots = new MediaRoots();
