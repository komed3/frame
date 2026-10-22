import { Config } from '@/src/server/core/Config';
import { MediaAssets } from '@/src/server/media/Assets';
import { getAssetSource, assetPath } from '@/src/server/job/handler/assets';
import type { JobContext, JobHandler } from '@/src/shared/types/job';
import { spawn } from 'node:child_process';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';


const waveformRate = 8000;


export class WaveJob implements JobHandler {
  public async execute ( { job, signal }: JobContext ) : Promise< void > {}
}
