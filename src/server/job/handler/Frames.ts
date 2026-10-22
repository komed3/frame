import { Config } from '@/src/server/core/Config';
import { assetSignal, getAssetSource, runFfmpeg } from '@/src/server/job/handler/assets';
import { MediaAssets } from '@/src/server/media/Assets';
import type { JobContext, JobHandler } from '@/src/shared/types/job';
import { randomUUID } from 'node:crypto';
import { mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, extname } from 'node:path';


export class FramesJob implements JobHandler {
  public async execute ( { job, signal }: JobContext ) : Promise< void > {
    if ( job.kind !== 'frames' ) throw new Error( 'Invalid frames job' );

    const S = assetSignal( signal );
    const source = await getAssetSource( job, S );
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

    S.throwIfAborted();
    await mkdir( dirname( outputDirectory ), { recursive: true } );
    await mkdir( tempDirectory, { recursive: true } );

    try {
      await runFfmpeg( [
        '-i', path, '-map', '0:V:0', '-vf', `${ select },${ scale }`, '-fps_mode', 'vfr',
        '-frames:v', String( count ), '-c:v', 'libwebp', '-quality', '76', '-start_number', '0',
        '-y', `${ tempDirectory }/%06d.webp`
      ], S );

      S.throwIfAborted();

      const files = ( await readdir( tempDirectory ) ).filter( f => extname( f ).toLowerCase() === '.webp' ).sort();
      if ( ! files.length ) throw new Error( `No frames generated for media ${ media.id }` );

      const frames = files.map( ( file, index ) => ( {
        index, timeMs: Math.min( durationMs, index * intervalMs ),
        path: `${ relativeDirectory }/${ file }`
      } ) );

      await writeFile( `${ tempDirectory }/manifest.json`, JSON.stringify( {
        version: 1, durationMs, intervalMs, width: 320, height: 180, frames
      } ) );

      S.throwIfAborted();
      let backedUp = false;

      try { await rename( outputDirectory, backupDirectory ), backedUp = true }
      catch ( err ) { if ( ( err as NodeJS.ErrnoException ).code !== 'ENOENT' ) throw err }

      try {
        await rename( tempDirectory, outputDirectory );
        S.throwIfAborted();

        await MediaAssets.write( media.id, {
          kind: 'frames', path: manifestPath, fingerprint: media.fingerprint,  mimeType: 'application/json',
          width: 320, height: 180, data: { frameCount: frames.length, durationMs, intervalMs }
        }, Buffer.from( JSON.stringify( { version: 1, durationMs, intervalMs, width: 320, height: 180, frames } ) ) );

        if ( backedUp ) await rm( backupDirectory, { recursive: true, force: true } );
      } catch ( err ) {
        await rm( outputDirectory, { recursive: true, force: true } );
        if ( backedUp ) await rename( backupDirectory, outputDirectory );
        throw err;
      }
    } catch ( err ) {
      await rm( tempDirectory, { recursive: true, force: true } );
      throw err;
    }

    if ( previous && previous.path !== manifestPath ) {
      const oldDirectory = dirname( MediaAssets.resolvePath( previous.path ) );
      if ( oldDirectory !== outputDirectory ) await rm( oldDirectory, { recursive: true, force: true } );
    }

    console.info( `[Frames] Media ${ media.id } (${ media.path }) generated: ${ count } frame(s).` );
  }
}
