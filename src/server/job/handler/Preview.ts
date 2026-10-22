import { Config } from '@/src/server/core/Config';
import { MediaAssets } from '@/src/server/media/Assets';
import { getAssetSource, assetPath, mediaExtension, runFfmpeg } from '@/src/server/job/handler/assets';
import type { JobContext, JobHandler } from '@/src/shared/types/job';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFileAsync } from '../../utils';


export class PreviewJob implements JobHandler {
  private async hasAttachedPicture ( path: string, signal: AbortSignal ) : Promise< boolean > {
    signal.throwIfAborted();

    const { stdout } = await execFileAsync( 'ffprobe', [
      '-v', 'error', '-select_streams', 'v', '-show_entries',
      'stream_disposition=attached_pic', '-of', 'json', path
    ], {
      encoding: 'utf8', timeout: Config.get( 'FFPROBE_TIMEOUT_MS' ),
      maxBuffer: 1024 * 1024, signal
    } );

    signal.throwIfAborted();

    const probe = JSON.parse( stdout ) as { streams?: Array< { disposition?: { attached_pic?: number } } > };
    return ( probe.streams ?? [] ).some( stream => stream.disposition?.attached_pic === 1 );
  }

  private async createImage (
    source: Awaited< ReturnType< typeof getAssetSource > > & {},
    kind: 'poster' | 'thumb', signal: AbortSignal
  ) : Promise< void > {
    if ( ! source ) return;

    const { media, path } = source;
    const isAudio = media.type === 'audio', isImage = media.type === 'image';
    const relativePath = assetPath( kind, source, '.webp' );
    const outputPath = MediaAssets.resolvePath( relativePath );
    const tempPath = `${ outputPath }.${ randomUUID() }.tmp.webp`;
    const limit = kind === 'poster' ? 1920 : 480;
    const scale = `scale=w='min(${ limit },iw)':h='min(${ limit },ih)':force_original_aspect_ratio=decrease:force_divisible_by=2`;

    signal.throwIfAborted();

    if ( isAudio && ! await this.hasAttachedPicture( path, signal ) ) {
      if ( MediaAssets.get( media.id, kind ) ) await MediaAssets.delete( media.id, kind );
      return;
    }

    await mkdir( dirname( outputPath ), { recursive: true } );

    try {
      if ( media.type === 'video' ) {
        const duration = Math.max( 0, ( media.durationMs ?? 0 ) / 1000 );
        const seek = duration > 1 ? duration * 0.1 : 0;

        await runFfmpeg( [
          '-ss', seek.toFixed( 3 ), '-i', path, '-map', '0:V:0', '-frames:v', '1', '-vf', scale,
          '-c:v', 'libwebp', '-quality', kind === 'poster' ? '86' : '78', '-y', tempPath
        ], signal );
      }

      else if ( isAudio ) await runFfmpeg( [
        '-i', path, '-map', '0:v:0', '-frames:v', '1', '-vf', scale, '-c:v', 'libwebp',
        '-quality', '84', '-y', tempPath
      ], signal );

      else if ( isImage && mediaExtension( path ) === '.svg' ) await runFfmpeg( [
        '-i', path, '-frames:v', '1', '-vf', scale, '-y', tempPath
      ], signal );

      else if ( isImage ) await runFfmpeg( [
        '-i', path, '-frames:v', '1', '-vf', scale, '-c:v', 'libwebp', '-quality',
        kind === 'poster' ? '86' : '78', '-y', tempPath
      ], signal );

      else return;

      signal.throwIfAborted();

      await MediaAssets.write( media.id, {
        kind, path: relativePath, fingerprint: media.fingerprint, mimeType: 'image/webp',
        data: { purpose: kind, mediaType: media.type }
      }, await readFile( tempPath ) );
    }

    catch ( err ) { throw err }
    finally { await rm( tempPath, { force: true } ) }
  }
}
