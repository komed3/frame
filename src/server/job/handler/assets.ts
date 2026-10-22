import { Config } from '@/src/server/core/Config';
import { Media } from '@/src/server/media/Media';
import { MediaRoots } from '@/src/server/media/Roots';
import { execFileAsync } from '@/src/server/utils';
import type { JobRecord } from '@/src/shared/types/job';
import type { MediaRecord } from '@/src/shared/types/media';
import { stat } from 'node:fs/promises';
import { extname } from 'node:path';
