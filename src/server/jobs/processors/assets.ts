import { db } from '@/src/server/db';
import { assetStorage } from '@/src/server/media/assets';
import type { MediaAssetSource, MediaAssetType, MediaJob } from '@/src/shared/types';
import { spawn } from 'node:child_process';
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';


const execFileAsync = promisify( execFile );
const frameRate = Number( process.env.FRAME_SCRUBBER_FPS || 1 );
const maxFrames = Number( process.env.FRAME_SCRUBBER_MAX_FRAMES || 600 );
const minFrames = Number( process.env.FRAME_SCRUBBER_MIN_FRAMES || 24 );
const waveformRate = 8000;


export class MediaAssetProcessor {
  public async process ( job: MediaJob ) : Promise< void > {
    if ( ! job.media_id || ! [ 'poster', 'thumb', 'frames', 'wave', 'text' ].includes( job.job_type ) )
      throw new Error( `Invalid asset job: ${ job.job_type }` );

    const media = this.getMedia( job.media_id );
    if ( ! media || ! media.is_available ) return;

    const sourcePath = this.getSourcePath( media );
    await this.verifySource( media, sourcePath );

    switch ( job.job_type ) {
      case 'poster': case 'thumb': return await this.createImageAsset( media, sourcePath, job.job_type );
      case 'frames': return await this.createFrames( media, sourcePath );
      case 'wave': return await this.createWave( media, sourcePath );
      case 'text': return await this.createTextPreview( media, sourcePath );
    }
  }
}
