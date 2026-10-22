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
}
