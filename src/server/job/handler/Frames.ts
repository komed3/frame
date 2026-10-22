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

    const maxFrames = Config.get( 'SCRUBBER_MAX_FRAMES' );
    const minFrames = Math.min( maxFrames, Config.get( 'SCRUBBER_MIN_FRAMES' ) );
    const count = Math.min( maxFrames, Math.max( minFrames, Math.ceil( durationMs / 1000 * Config.get( 'SCRUBBER_FPS' ) ) ) );
    const intervalMs = Math.ceil( durationMs / count );
    const relativeDirectory = `frames/${ media.id }-${ source.fingerprint }`;
    const outputDirectory = MediaAssets.resolvePath( relativeDirectory );
    const tempDirectory = `${ outputDirectory }.tmp-${ randomUUID() }`;
    const manifestPath = `${ relativeDirectory }/manifest.json`;
    const scale = `scale=w='min(320,iw)':h='min(180,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2`;
    const select = `select='isnan(prev_selected_t)+gte(t-prev_selected_t\\,${ ( intervalMs / 1000 ).toFixed( 8 ) })'`;
    const previous = MediaAssets.get( media.id, 'frames' );
    const backupDirectory = `${ outputDirectory }.bak-${ randomUUID() }`;
  }
}
