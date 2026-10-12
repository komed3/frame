import { db } from '@/src/server/db';
import { assetStorage } from '@/src/server/media/assets';
import type { MediaAssetSource, MediaAssetType, MediaJob } from '@/src/shared/types';
import { execFile, spawn } from 'node:child_process';
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { promisify } from 'node:util';


const execFileAsync = promisify( execFile );
const frameRate = Number( process.env.FRAME_SCRUBBER_FPS || 1 );
const maxFrames = Number( process.env.FRAME_SCRUBBER_MAX_FRAMES || 600 );
const minFrames = Number( process.env.FRAME_SCRUBBER_MIN_FRAMES || 24 );
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

  private async verifySource ( media: MediaAssetSource, path: string ) : Promise< void > {
    const info = await stat( path );

    if ( info.size !== media.file_size || ( media.file_mtime_ms !== null && info.mtimeMs !== media.file_mtime_ms ) )
      throw new Error( `Media changed since scan: ${ path }` );
  }

  private async runFfmpeg ( args: string[] ) : Promise< void > {
    await execFileAsync(
      'ffmpeg', [ '-hide_banner', '-loglevel', 'error', '-nostdin', ...args ],
      { timeout: 10 * 60_000, maxBuffer: 4 * 1024 * 1024 }
    );
  }

  private async verifyOutput ( path: string ) : Promise< void > {
    const info = await stat( path );
    if ( ! info.isFile() || info.size === 0 ) throw new Error( `FFmpeg produced no usable output: ${ path }` );
  }

  private async commitAsset (
    media: MediaAssetSource, type: MediaAssetType, relativePath: string, width: number | null,
    height: number | null, metadata: Record< string, unknown > = {}
  ) : Promise< void > {
    const fingerprint = assetStorage.fingerprint( media );

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
    `).run(
      media.id, type, relativePath, fingerprint,
      width, height, JSON.stringify( metadata )
    );
  }

  private async hasAttachedPicture ( sourcePath: string ) : Promise< boolean > {
    const { stdout } = await execFileAsync( 'ffprobe', [
      '-v', 'error', '-select_streams', 'v', '-show_entries',
      'stream_disposition=attached_pic', '-of', 'json', sourcePath
    ], { encoding: 'utf8', timeout: 30_000, maxBuffer: 1024 * 1024 } );

    const probe = JSON.parse( stdout ) as { streams?: Array< { disposition?: { attached_pic?: number } } > };
    return ( probe.streams ?? [] ).some( stream => stream.disposition?.attached_pic === 1 );
  }

  private async removeAsset ( mediaId: number, type: 'poster' | 'thumb' ) : Promise< void > {
    const asset = db.prepare( `
      SELECT relative_path FROM media_assets
      WHERE media_id = ? AND asset_type = ?
    ` ).get( mediaId, type ) as { relative_path: string } | undefined;

    db.prepare( 'DELETE FROM media_assets WHERE media_id = ? AND asset_type = ?' ).run( mediaId, type );
    if ( asset ) await rm( assetStorage.absolutePath( asset.relative_path ), { force: true } );
  }

  private async createImageAsset ( media: MediaAssetSource, sourcePath: string, type: 'poster' | 'thumb' ) : Promise< void > {
    const fingerprint = assetStorage.fingerprint( media );
    const relativePath = assetStorage.relativePath( type, media.id, fingerprint, '.webp' );
    const outputPath = assetStorage.absolutePath( relativePath );
    const tempPath = `${ outputPath }.tmp.webp`;

    await assetStorage.ensureParent( outputPath );

    const isAudio = media.media_type === 'audio';
    const isImage = media.media_type === 'image';
    const limit = type === 'poster' ? 1920 : 480;
    const scale = `scale=w='min(${ limit },iw)':h='min(${ limit },ih)':force_original_aspect_ratio=decrease:force_divisible_by=2`;

    try {
      if ( isImage && extname( sourcePath ).toLowerCase() === '.svg' )
        await this.runFfmpeg( [ '-i', sourcePath, '-frames:v', '1', '-vf', scale, '-y', tempPath ] );

      else if ( isAudio )
        try { await this.runFfmpeg( [
          '-i', sourcePath, '-map', '0:v:0', '-frames:v', '1', '-vf', scale, '-c:v',
          'libwebp', '-quality', '84', '-y', tempPath
        ] ) }
        catch { await this.createAudioFallback( sourcePath, tempPath, scale ) }

      else if ( media.media_type === 'video' ) {
        const duration = Math.max( 0, ( media.duration_ms ?? 0 ) / 1000 );
        const seek = duration > 1 ? duration * 0.1 : 0;

        await this.runFfmpeg( [
          '-ss', seek.toFixed( 3 ), '-i', sourcePath, '-map', '0:V:0', '-frames:v', '1', '-vf', scale,
          '-c:v', 'libwebp', '-quality', type === 'poster' ? '86' : '78', '-y', tempPath
        ] );
      }

      else if ( isImage ) await this.runFfmpeg( [
        '-i', sourcePath, '-frames:v', '1', '-vf', scale, '-c:v', 'libwebp',
        '-quality', type === 'poster' ? '86' : '78', '-y', tempPath
      ] );

      else return;

      await this.verifySource( media, sourcePath );
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

      if ( ! files.length ) throw new Error( `No frames generated for media ${ media.id }` );

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
      { frameCount: count, durationMs, intervalMs }
    );
  }

  private async createWave ( media: MediaAssetSource, sourcePath: string ) : Promise< void > {
    if ( ! [ 'video', 'audio' ].includes( media.media_type ) || ! media.audio_codec ) return;

    const durationSeconds = Math.max( 0, ( media.duration_ms ?? 0 ) / 1000 );
    if ( ! durationSeconds ) throw new Error( `Audio duration is unknown: ${ media.id }` );

    const targetPoints = Math.min( 1_500_000, Math.max( 8000, Math.ceil( durationSeconds * 100 ) ) );
    const samplesPerPoint = Math.max( 1, Math.ceil( waveformRate * durationSeconds / targetPoints ) );
    const child = spawn( 'ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-nostdin', '-i', sourcePath, '-map', '0:a:0', '-vn',
      '-ac', '1', '-ar', String( waveformRate ), '-f', 'f32le', 'pipe:1'
    ], { stdio: [ 'ignore', 'pipe', 'pipe' ] } );

    child.stderr.resume();

    const values: Array< [ number, number ] > = [];
    let min = Infinity, max = -Infinity, samples = 0;
    let carry = Buffer.alloc( 0 );

    const writePoint = () => {
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
          const normalized = Number.isFinite( value ) ? Math.max( -1, Math.min( 1, value ) ) : 0;
          min = Math.min( min, normalized );
          max = Math.max( max, normalized );

          if ( ++samples >= samplesPerPoint ) writePoint();
        }

        carry = buffer.subarray( completeLength ) as Buffer< ArrayBuffer >;
      }

      writePoint();

      if ( await exitPromise !== 0 )
        throw new Error( `ffmpeg waveform extraction failed for media ${ media.id }` );
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
