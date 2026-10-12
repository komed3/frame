import { db } from '@/src/server/db';
import { assetStorage } from '@/src/server/media/assets';
import { envInteger, envNumber } from '@/src/server/utils';
import type { MediaAssetSource, MediaAssetType, MediaJob } from '@/src/shared/types';
import { execFile, spawn } from 'node:child_process';
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { promisify } from 'node:util';


const execFileAsync = promisify( execFile );

const assetTimeoutMs = envInteger( 'FRAME_ASSET_TIMEOUT_MS', 25 * 60_000, 1_000, 24 * 60 * 60_000 );
const ffmpegTimeoutMs = envInteger( 'FRAME_FFMPEG_TIMEOUT_MS', assetTimeoutMs, 1_000, 24 * 60 * 60_000 );
const ffprobeTimeoutMs = envInteger( 'FRAME_FFPROBE_TIMEOUT_MS', Math.min( assetTimeoutMs, 2 * 60_000 ), 1_000, 24 * 60 * 60_000 );
const waveformTimeoutMs = envInteger( 'FRAME_WAVE_TIMEOUT_MS', ffmpegTimeoutMs, 1_000, 24 * 60 * 60_000 );
const frameRate = envNumber( 'FRAME_SCRUBBER_FPS', 1, 0.1, 10 );
const maxFrames = envInteger( 'FRAME_SCRUBBER_MAX_FRAMES', 450, 1, 500 );
const minFrames = envInteger( 'FRAME_SCRUBBER_MIN_FRAMES', 24, 1, maxFrames );
const waveformRate = 8000;


export class MediaAssetProcessor {
  private getMedia ( id: number ) : MediaAssetSource | undefined {
    return db.prepare( `
      SELECT media.id, media.media_type, media.file_name, media.file_size,
        media.file_mtime_ms, media.content_hash, media.duration_ms,
        media.width, media.height, media.audio_codec, media.is_available,
        media.root_relative_path, media_roots.path AS root_path
      FROM media
      JOIN media_roots ON media_roots.id = media.media_root_id
      WHERE media.id = ?
    ` ).get( id ) as MediaAssetSource | undefined;
  }

  private getSourcePath ( media: MediaAssetSource ) : string {
    const root = resolve( media.root_path );
    const path = resolve( root, media.root_relative_path );
    const relativePath = path.slice( root.length );

    if ( relativePath.startsWith( sep + '..' ) || path === root )
      throw new Error( `Media path escapes its root: ${ media.root_relative_path }` );

    return path;
  }

  private async runFfmpeg ( args: string[] ) : Promise< void > {
    await execFileAsync( 'ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-nostdin', '-protocol_whitelist', 'file,pipe',
      '-max_alloc', '536870912', '-max_pixels', '89128960', ...args
    ], { timeout: ffmpegTimeoutMs, maxBuffer: 4 * 1024 * 1024 } );
  }

  private async commitAsset (
    media: MediaAssetSource, type: MediaAssetType, relativePath: string, width: number | null,
    height: number | null, metadata: Record< string, unknown > = {}
  ) : Promise< void > {
    db.prepare( `
      INSERT INTO media_assets (
        media_id, asset_type, relative_path, source_fingerprint,
        width, height, metadata_json
      )
      VALUES ( ?, ?, ?, ?, ?, ?, ? )
      ON CONFLICT ( media_id, asset_type ) DO UPDATE SET
        relative_path = excluded.relative_path,
        source_fingerprint = excluded.source_fingerprint,
        width = excluded.width,
        height = excluded.height,
        metadata_json = excluded.metadata_json,
        created_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )
    ` ).run(
      media.id, type, relativePath, assetStorage.fingerprint( media ),
      width, height, JSON.stringify( metadata )
    );
  }

  private async hasAttachedPicture ( sourcePath: string ) : Promise< boolean > {
    const { stdout } = await execFileAsync( 'ffprobe', [
      '-v', 'error', '-select_streams', 'v', '-show_entries',
      'stream_disposition=attached_pic', '-of', 'json', sourcePath
    ], { encoding: 'utf8', timeout: ffprobeTimeoutMs, maxBuffer: 1024 * 1024 } );

    const probe = JSON.parse( stdout ) as { streams?: Array< { disposition?: { attached_pic?: number } } > };
    return ( probe.streams ?? [] ).some( stream => stream.disposition?.attached_pic === 1 );
  }

  private async createImageAsset ( media: MediaAssetSource, sourcePath: string, type: 'poster' | 'thumb' ) : Promise< void > {
    const relativePath = assetStorage.relativePath( type, media.id, assetStorage.fingerprint( media ), '.webp' );
    const outputPath = assetStorage.absolutePath( relativePath );
    const tempPath = `${ outputPath }.tmp.webp`;
    const isAudio = media.media_type === 'audio';
    const isImage = media.media_type === 'image';
    const limit = type === 'poster' ? 1920 : 480;
    const scale = `scale=w='min(${ limit },iw)':h='min(${ limit },ih)':force_original_aspect_ratio=decrease:force_divisible_by=2`;

    await assetStorage.ensureParent( outputPath );

    if ( isAudio && ! await this.hasAttachedPicture( sourcePath ) ) return;

    try {
      if ( isImage && extname( sourcePath ).toLowerCase() === '.svg' )
        await this.runFfmpeg( [ '-i', sourcePath, '-frames:v', '1', '-vf', scale, '-y', tempPath ] );

      else if ( isAudio ) await this.runFfmpeg( [
        '-i', sourcePath, '-map', '0:v:0', '-frames:v', '1', '-vf', scale,
        '-c:v', 'libwebp', '-quality', '84', '-y', tempPath
      ] );

      else if ( media.media_type === 'video' ) {
        const duration = Math.max( 0, ( media.duration_ms ?? 0 ) / 1000 );
        const seek = duration > 1 ? duration * 0.1 : 0;

        await this.runFfmpeg( [
          '-ss', seek.toFixed( 3 ), '-i', sourcePath, '-map', '0:V:0', '-frames:v', '1',
          '-vf', scale, '-c:v', 'libwebp', '-quality', type === 'poster' ? '86' : '78',
          '-y', tempPath
        ] );
      }

      else if ( isImage ) await this.runFfmpeg( [
        '-i', sourcePath, '-frames:v', '1', '-vf', scale, '-c:v', 'libwebp',
        '-quality', type === 'poster' ? '86' : '78', '-y', tempPath
      ] );

      else return;

      await rename( tempPath, outputPath );
    } catch ( err ) {
      await rm( tempPath, { force: true } );
      throw err;
    }

    await this.commitAsset( media, type, relativePath, null, null, {
      purpose: type, mediaType: media.media_type
    } );
  }

  private async createFrames ( media: MediaAssetSource, sourcePath: string ) : Promise< void > {
    if ( media.media_type !== 'video' ) return;

    const durationMs = media.duration_ms ?? 0;
    if ( durationMs <= 0 ) throw new Error( `Video duration is unknown: ${ media.id }` );

    const durationSeconds = durationMs / 1000;
    const count = Math.max( minFrames, Math.min( maxFrames, Math.ceil( durationSeconds * frameRate ) ) );
    const intervalMs = Math.round( durationMs / count );
    const relativeDirectory = `frames/${ media.id }-${ assetStorage.fingerprint( media ) }`;
    const outputDirectory = assetStorage.absolutePath( relativeDirectory );
    const tempDirectory = `${ outputDirectory }.tmp`;

    await rm( tempDirectory, { recursive: true, force: true } );
    await mkdir( tempDirectory, { recursive: true } );

    try {
      await this.runFfmpeg( [
        '-i', sourcePath, '-map', '0:V:0', '-vf',
        `fps=${ ( count / durationSeconds ).toFixed( 8 ) },scale=w='min(320,iw)':h='min(180,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2`,
        '-frames:v', String( count ), '-c:v', 'libwebp', '-quality', '76', '-start_number', '0',
        '-y', `${ tempDirectory }/%06d.webp`
      ] );

      const files = ( await readdir( tempDirectory ) )
        .filter( file => extname( file ).toLowerCase() === '.webp' )
        .sort();

      if ( ! files.length || files.length > maxFrames ) throw new Error( `Invalid frame count for media ${ media.id }: ${ files.length }` );
      for ( const file of files ) await this.verifyOutput( resolve( tempDirectory, file ) );

      const frames = files.map( ( file, index ) => ( {
        index, timeMs: Math.min( durationMs, index * intervalMs ),
        path: `${ relativeDirectory }/${ file }`
      } ) );

      await writeFile( `${ tempDirectory }/manifest.json`, JSON.stringify( {
        version: 1, durationMs, intervalMs, width: 320, height: 180, frames
      } ) );

      await this.verifySource( media, sourcePath );
      await rm( outputDirectory, { recursive: true, force: true } );
      await rename( tempDirectory, outputDirectory );
    } catch ( err ) {
      await rm( tempDirectory, { recursive: true, force: true } );
      throw err;
    }

    await this.commitAsset(
      media, 'frames', `${ relativeDirectory }/manifest.json`, 320, 180,
      { frameCount: frames.length, durationMs, intervalMs }
    );
  }

  private async createWave ( media: MediaAssetSource, sourcePath: string ) : Promise< void > {
    if ( ! [ 'video', 'audio' ].includes( media.media_type ) || ! media.audio_codec ) return;

    const durationSeconds = Math.max( 0, ( media.duration_ms ?? 0 ) / 1000 );
    if ( ! durationSeconds ) throw new Error( `Audio duration is unknown: ${ media.id }` );

    const targetPoints = Math.min( 1_500_000, Math.max( 8000, Math.ceil( durationSeconds * 100 ) ) );
    const samplesPerPoint = Math.max( 1, Math.ceil( waveformRate * durationSeconds / targetPoints ) );
    const child = spawn( 'ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-nostdin', '-protocol_whitelist', 'file,pipe',
      '-max_alloc', '536870912', '-i', sourcePath, '-t', durationSeconds.toFixed( 3 ), '-map',
      '0:a:0', '-vn', '-ac', '1', '-ar', String( waveformRate ), '-f', 'f32le', 'pipe:1'
    ], { stdio: [ 'ignore', 'pipe', 'pipe' ] } );

    let timedOut = false;
    const timeout = setTimeout( () => timedOut = true && child.kill( 'SIGKILL' ), 10 * 60_000 );

    timeout.unref();
    child.stderr.resume();

    const values: Array< [ number, number ] > = [];
    let min = Infinity, max = -Infinity, samples = 0;
    let carry = Buffer.alloc( 0 );

    const writePoint = () => {
      if ( values.length >= targetPoints ) throw new Error( `Waveform exceeded point limit for media ${ media.id }` );
      if ( ! samples ) return;

      values.push( [ min, max ] );
      min = Infinity, max = -Infinity;
      samples = 0;
    };

    const exitPromise = new Promise< number >( ( resolveExit, reject ) => {
      child.once( 'error', reject );
      child.once( 'close', code => resolveExit( code ?? -1 ) );
    } );

    try {
      for await ( const chunk of child.stdout ) {
        const buffer = carry.length ? Buffer.concat( [ carry, chunk as Buffer ] ) : chunk as Buffer;
        const completeLength = buffer.length - buffer.length % 4;

        for ( let offset = 0; offset < completeLength; offset += 4 ) {
          const value = buffer.readFloatLE( offset );

          if ( ! Number.isFinite( value ) )
            throw new Error( `Invalid audio sample for media ${ media.id }` );

          const normalized = Math.max( -1, Math.min( 1, value ) );
          min = Math.min( min, normalized );
          max = Math.max( max, normalized );

          if ( ++samples >= samplesPerPoint ) writePoint();
        }

        carry = buffer.subarray( completeLength ) as Buffer< ArrayBuffer >;
      }

      if ( carry.length ) throw new Error( `Incomplete waveform sample for media ${ media.id }` );

      writePoint();

      if ( ! values.length ) throw new Error( `No audio samples generated for media ${ media.id }` );
      if ( timedOut || await exitPromise !== 0 ) throw new Error( `FFmpeg waveform extraction failed for media ${ media.id }` );
    } catch ( err ) {
      child.kill( 'SIGTERM' );
      throw err;
    }

    await this.verifySource( media, sourcePath );

    const header = Buffer.alloc( 24 );
    Buffer.from( 'FRMWAV1\0', 'ascii' ).copy( header, 0 );
    header.writeUInt32LE( Math.round( waveformRate / samplesPerPoint ), 8 );
    header.writeUInt32LE( values.length, 12 );
    header.writeDoubleLE( durationSeconds, 16 );

    const data = Buffer.alloc( values.length * 4 );
    values.forEach( ( [ low, high ], index ) => {
      data.writeInt16LE( Math.round( low * 32767 ), index * 4 );
      data.writeInt16LE( Math.round( high * 32767 ), index * 4 + 2 );
    } );

    const fingerprint = assetStorage.fingerprint( media );
    const relativePath = assetStorage.relativePath( 'wave', media.id, fingerprint, '.bin' );
    const outputPath = assetStorage.absolutePath( relativePath );
    const tempPath = `${ outputPath }.tmp`;

    await assetStorage.ensureParent( outputPath );

    try {
      await writeFile( tempPath, Buffer.concat( [ header, data ] ) );
      await rename( tempPath, outputPath );
    } catch ( err ) {
      await rm( tempPath, { force: true } );
      throw err;
    }

    await this.commitAsset( media, 'wave', relativePath, null, null, {
      format: 'FRMWAV1', durationMs: media.duration_ms, pointCount: values.length,
      values: 'signed-int16-min-max'
    } );
  }

  private async createTextPreview ( media: MediaAssetSource, sourcePath: string ) : Promise< void > {
    if ( media.media_type !== 'text' ) return;

    const fingerprint = assetStorage.fingerprint( media );
    const relativePath = assetStorage.relativePath( 'text', media.id, fingerprint, '.txt' );
    const outputPath = assetStorage.absolutePath( relativePath );
    const tempPath = `${ outputPath }.tmp`;

    await assetStorage.ensureParent( outputPath );

    try {
      const file = await readFile( sourcePath );
      const preview = file.subarray( 0, 16 * 1024 ).toString( 'utf8' );
      await writeFile( tempPath, preview );
      await rename( tempPath, outputPath );
    } catch ( err ) {
      await rm( tempPath, { force: true } );
      throw err;
    }

    await this.commitAsset( media, 'text', relativePath, null, null, {
      maxBytes: 16 * 1024, encoding: 'utf-8'
    } );
  }

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


export const mediaAssetProcessor = new MediaAssetProcessor();
export const processAssetJob = ( job: MediaJob ) : Promise< void > =>
  mediaAssetProcessor.process( job );
