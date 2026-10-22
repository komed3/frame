import { Config } from '@/src/server/core/Config';
import { Media } from '@/src/server/media/Media';
import { MediaRoots } from '@/src/server/media/Roots';
import { execFileAsync } from '@/src/server/utils';
import type { AssetSource, JobRecord } from '@/src/shared/types/job';
import type { MediaRecord } from '@/src/shared/types/media';
import { stat } from 'node:fs/promises';
import { extname } from 'node:path';


export async function getAssetSource ( job: JobRecord, signal: AbortSignal ) : Promise< AssetSource | null > {
  signal.throwIfAborted();

  if ( job.mediaId === null || job.rootId !== null ) throw new Error( `Invalid asset job: ${ job.kind }` );

  const media = Media.get( job.mediaId );
  if ( ! media || ! media.available ) return null;

  const root = MediaRoots.list().find( root => root.id === media.rootId );
  if ( ! root ) throw new Error( `Media root ${ media.rootId } does not exist` );
  if ( ! root.enabled ) {
    console.warn( `[${ job.kind }] Skipping disabled root ${ root.id }.` );
    return null;
  }

  const path = MediaRoots.resolve( media.rootId, media.path );
  const info = await stat( path );

  signal.throwIfAborted();

  if ( info.size !== media.sizeBytes || ( media.modifiedAt !== null &&
    info.mtimeMs !== new Date( media.modifiedAt ).getTime() ) )
    throw new Error( `Media changed since scan: ${ path }` );

  return { media, path, fingerprint:
    ( media.fingerprint ?? `${ media.sizeBytes }-${ media.modifiedAt ?? 'unknown' }` )
      .replace( /[^a-zA-Z0-9_-]/g, '_' ) };
}


export function assetPath ( kind: string, source: AssetSource, extension: string ) : string {
  return `${ kind }/${ source.media.id }-${ source.fingerprint }${ extension }`;
}


export function mediaExtension ( path: string ) : string {
  return extname( path ).toLowerCase();
}


export async function runFfmpeg ( args: string[], signal: AbortSignal ) : Promise< void > {
  signal.throwIfAborted();

  await execFileAsync( 'ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-nostdin', '-protocol_whitelist', 'file,pipe',
    '-max_alloc', '536870912', '-max_pixels', '89128960', ...args
  ], { timeout: Config.get( 'FFMPEG_TIMEOUT_MS' ), maxBuffer: 4 * 1024 * 1024, signal } );

  signal.throwIfAborted();
}
