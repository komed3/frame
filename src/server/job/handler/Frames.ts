import { Config } from '@/src/server/core/Config';
import { MediaAssets } from '@/src/server/media/Assets';
import { getAssetSource, assetPath, runFfmpeg } from '@/src/server/job/handler/assets';
import type { JobContext, JobHandler } from '@/src/shared/types/job';
import { mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { extname, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';


export class FramesJob implements JobHandler {
  public async execute ( { job, signal }: JobContext ) : Promise< void > {
    if ( job.kind !== 'frames' ) throw new Error( 'Invalid frames job' );

    const source = await getAssetSource( job, signal );
    if ( ! source || source.media.type !== 'video' ) return;

    const { media, path } = source, durationMs = media.durationMs ?? 0;
    if ( durationMs <= 0 ) throw new Error( `Video duration is unknown: ${ media.id }` );
  }
}
