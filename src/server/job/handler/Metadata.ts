import { MediaRoots } from '@/src/server/media/Roots';
import { Media } from '@/src/server/media/Media';
import type { JobContext, JobHandler } from '@/src/shared/types/job';
import type { MediaType, MediaUpdate } from '@/src/shared/types/media';
import { execFile } from 'node:child_process';
import { open, stat } from 'node:fs/promises';
import { extname } from 'node:path';
import { promisify } from 'node:util';


