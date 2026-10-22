import { Media } from '@/src/server/media/Media';
import { MediaMetadata } from '@/src/server/media/Metadata';
import { MediaRoots } from '@/src/server/media/Roots';
import type { JobContext, JobHandler } from '@/src/shared/types/job';
import { open, stat } from 'node:fs/promises';
