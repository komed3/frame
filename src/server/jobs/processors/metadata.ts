import { db } from '@/src/server/db';
import type { MediaJob, MediaMetadata, MediaSourceRecord } from '@/src/shared/types';
import { execFile } from 'node:child_process';
import { open, stat } from 'node:fs/promises';
import { extname, relative, resolve, sep } from 'node:path';
import { promisify } from 'node:util';


const execFileAsync = promisify( execFile );
