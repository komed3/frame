import { Config } from '@/src/server/core/Config';
import { MediaAssets } from '@/src/server/media/Assets';
import { getAssetSource, assetPath, runFfmpeg } from '@/src/server/job/handler/assets';
import type { JobContext, JobHandler } from '@/src/shared/types/job';
import { mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { extname, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
