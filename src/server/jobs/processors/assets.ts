import { execFile, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import { db } from '../../db';
import type { MediaJob } from '../queue';


interface MediaRecord {
  id: number;
  media_type: 'video' | 'audio' | 'image' | 'text' | 'other';
  file_size: number;
  file_mtime_ms: number | null;
  content_hash: string | null;
  duration_ms: number | null;
  width: number | null;
  height: number | null;
  audio_codec: string | null;
  root_path: string;
  root_relative_path: string;
  is_available: number;
  file_name: string;
}

interface AssetRecord {
  id: number;
  relative_path: string;
  metadata_json: string;
}

interface AssetMetadata {
  thumbnailPath?: string;
  [ key: string ]: unknown;
}


const execFileAsync = promisify( execFile );
const databasePath = resolve( process.env.FRAME_DB_PATH || 'data/frame.sqlite' );
const dataDirectory = dirname( databasePath );
const assetDirectory = resolve( dataDirectory, 'assets' );

const waveformSampleRate = 8000;
const waveformMinPoints = 8000;
const waveformMaxPoints = 1_500_000;
const previewMinCount = 2;
const previewMaxCount = 1000;


function clamp ( value: number, min: number, max: number ) : number {
  return Math.max( min, Math.min( max, value ) );
}

function toRelativePath ( path: string ) : string {
  return relative( dataDirectory, path ).split( sep ).join( '/' );
}

function getAssetPath ( path: string ) : string {
  const absolutePath = resolve( dataDirectory, path );
  const pathFromRoot = relative( dataDirectory, absolutePath );

  if (
    pathFromRoot === '..' || pathFromRoot.startsWith( `..${ sep }` ) ||
    resolve( pathFromRoot ) === resolve( '..' )
  ) throw new Error( `Asset path escapes the data directory: ${ path }` );

  return absolutePath;
}

function getMediaPath ( media: MediaRecord ) : string {
  const root = resolve( media.root_path );
  const path = resolve( root, media.root_relative_path );
  const pathFromRoot = relative( root, path );

  if (
    ! media.root_relative_path || pathFromRoot === '..' ||
    pathFromRoot.startsWith( `..${ sep }` ) || resolve( pathFromRoot ) === resolve( '..' )
  ) throw new Error( `Media path escapes its root: ${ media.root_relative_path }` );

  return path;
}

async function getMediaRecord ( mediaId: number ) : Promise< MediaRecord | undefined > {
  return db.prepare( `
    SELECT
      media.id,
      media.media_type,
      media.file_size,
      media.file_mtime_ms,
      media.content_hash,
      media.duration_ms,
      media.width,
      media.height,
      media.audio_codec,
      media.root_relative_path,
      media.is_available,
      media_roots.path AS root_path
    FROM media
    JOIN media_roots ON media_roots.id = media.media_root_id
    WHERE media.id = ?
  ` ).get( mediaId ) as MediaRecord | undefined;
}

async function verifySource ( media: MediaRecord, path: string ) : Promise< void > {
  const fileStat = await stat( path );

  if (
    fileStat.size !== media.file_size ||
    ( media.file_mtime_ms !== null && fileStat.mtimeMs !== media.file_mtime_ms )
  ) throw new Error( `Media changed since scan; scan it again: ${ path }` );
}

function getFingerprint ( media: MediaRecord ) : string {
  return createHash( 'sha256' )
    .update( `${ media.content_hash || '' }:${ media.file_size }:${ media.file_mtime_ms ?? '' }` )
    .digest( 'hex' ).slice( 0, 20 );
}

function getDurationSeconds ( media: MediaRecord ) : number {
  const duration = ( media.duration_ms || 0 ) / 1000;

  if ( ! Number.isFinite( duration ) || duration <= 0 )
    throw new Error( `Media ${ media.id } has no valid duration` );

  return duration;
}

function getScaledDimensions ( width: number | null, height: number | null, maxWidth: number, maxHeight: number ) : {
  width: number | null; height: number | null
} {
  if ( ! width || ! height ) return { width: null, height: null };
  const scale = Math.min( 1, maxWidth / width, maxHeight / height );

  return {
    width: Math.max( 1, Math.round( width * scale ) ),
    height: Math.max( 1, Math.round( height * scale ) )
  };
}

async function runFfmpeg ( args: string[] ) : Promise< void > {
  await execFileAsync( 'ffmpeg', [ '-hide_banner', '-loglevel', 'error', '-nostdin', ...args ], {
    encoding: 'utf8', maxBuffer: 16 * 1024 * 1024
  } );
}

async function removeAssetFiles ( assetType: string, relativePath: string, metadataJson: string ) : Promise< void > {
  const absolutePath = getAssetPath( relativePath );

  if ( assetType === 'scrubber' ) await rm( dirname( absolutePath ), { recursive: true, force: true } );
  else await rm( absolutePath, { force: true } );

  let metadata: AssetMetadata = {};

  try { metadata = JSON.parse( metadataJson ) as AssetMetadata }
  catch {}

  if ( metadata.thumbnailPath ) await rm( getAssetPath( metadata.thumbnailPath ), { force: true } );
}

async function replaceAsset (
  mediaId: number, assetType: 'poster' | 'scrubber' | 'image_preview' | 'waveform',
  fingerprint: string, relativePath: string, width: number | null,
  height: number | null, metadata: Record< string, unknown > = {}
) : Promise< void > {
  const oldAssets = db.prepare( `
    SELECT id, relative_path, metadata_json
    FROM media_assets
    WHERE media_id = ?
      AND asset_type = ?
      AND source_fingerprint <> ?
  ` ).all( mediaId, assetType, fingerprint ) as unknown as AssetRecord[];

  db.prepare( `
    DELETE FROM media_assets
    WHERE media_id = ?
      AND asset_type = ?
      AND source_fingerprint <> ?
  ` ).run( mediaId, assetType, fingerprint );

  db.prepare( `
    INSERT INTO media_assets (
      media_id, asset_type, relative_path, source_fingerprint,
      width, height, metadata_json
    )
    VALUES ( ?, ?, ?, ?, ?, ?, ? )
    ON CONFLICT ( media_id, asset_type, source_fingerprint ) DO UPDATE SET
      relative_path = excluded.relative_path,
      width = excluded.width,
      height = excluded.height,
      metadata_json = excluded.metadata_json
  ` ).run(
    mediaId, assetType, relativePath, fingerprint,
    width, height, JSON.stringify( metadata )
  );

  for ( const asset of oldAssets )
    await removeAssetFiles( assetType, asset.relative_path, asset.metadata_json );
}


async function processPoster ( media: MediaRecord, path: string, fingerprint: string ) : Promise< void > {
  if ( media.media_type !== 'video' ) return;

  const duration = getDurationSeconds( media );
  const posterRelativePath = `assets/posters/${ media.id }-${ fingerprint }.webp`;
  const thumbnailRelativePath = `assets/thumbnails/${ media.id }-${ fingerprint }.webp`;
  const posterPath = getAssetPath( posterRelativePath );
  const thumbnailPath = getAssetPath( thumbnailRelativePath );
  const posterTempPath = posterPath.replace( /\.webp$/i, '.tmp.webp' );
  const thumbnailTempPath = thumbnailPath.replace( /\.webp$/i, '.tmp.webp' );

  await mkdir( dirname( posterPath ), { recursive: true } );
  await mkdir( dirname( thumbnailPath ), { recursive: true } );

  const seekSeconds = Math.min( Math.max( duration * 0.1, 0 ), Math.max( duration - 0.1, 0 ) );

  try {
    await runFfmpeg( [
      '-ss', seekSeconds.toFixed( 3 ), '-i', path, '-map', '0:v:0', '-frames:v', '1',
      '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease:force_divisible_by=2',
      '-c:v', 'libwebp', '-quality', '86', '-compression_level', '6', '-y', posterTempPath
    ] );

    await runFfmpeg( [
      '-i', posterTempPath, '-frames:v', '1',
      '-vf', 'scale=480:270:force_original_aspect_ratio=decrease:force_divisible_by=2',
      '-c:v', 'libwebp', '-quality', '78', '-compression_level', '6',
      '-y', thumbnailTempPath
    ] );

    await verifySource( media, path );
    await rename( posterTempPath, posterPath );
    await rename( thumbnailTempPath, thumbnailPath );
  } catch ( error ) {
    await rm( posterTempPath, { force: true } );
    await rm( thumbnailTempPath, { force: true } );
    throw error;
  }

  const dimensions = getScaledDimensions( media.width, media.height, 1920, 1080 );

  await replaceAsset(
    media.id, 'poster', fingerprint, posterRelativePath, dimensions.width, dimensions.height,
    { thumbnailPath: thumbnailRelativePath, thumbnailWidth: 480, thumbnailHeight: 270 }
  );
}

async function processScrubber ( media: MediaRecord, path: string, fingerprint: string ) : Promise< void > {
  if ( media.media_type !== 'video' ) return;

  const duration = getDurationSeconds( media );
  const count = clamp( Math.round( 40 * Math.sqrt( duration / 20 ) ), previewMinCount, previewMaxCount );
  const frameRate = count / duration;

  const directoryRelativePath = `assets/video-previews/${ media.id }-${ fingerprint }`;
  const directoryPath = getAssetPath( directoryRelativePath );
  const tempDirectoryPath = `${ directoryPath }.tmp`;
  const manifestRelativePath = `${ directoryRelativePath }/manifest.json`;
  const manifestPath = getAssetPath( manifestRelativePath );

  await rm( tempDirectoryPath, { recursive: true, force: true } );
  await mkdir( tempDirectoryPath, { recursive: true } );

  try {
    await runFfmpeg( [
      '-i', path, '-map', '0:v:0',
      '-vf', `fps=${ frameRate.toFixed( 10 ) },scale=320:180:force_original_aspect_ratio=decrease:force_divisible_by=2`,
      '-frames:v', String( count ), '-c:v', 'libwebp', '-quality', '76', '-compression_level', '6',
      '-start_number', '0', '-y', `${ tempDirectoryPath }/%06d.webp`
    ] );

    const files = ( await readdir( tempDirectoryPath ) )
      .filter( file => extname( file ).toLowerCase() === '.webp' )
      .sort();

    if ( files.length === 0 ) throw new Error( `No preview frames were generated for media ${ media.id }` );
    await verifySource( media, path );

    const frames = files.map( ( file, index ) => ( {
      index, timeMs: Math.round( duration * 1000 * index / count ),
      path: `${ directoryRelativePath }/${ file }`
    } ) );

    await writeFile(
      `${ tempDirectoryPath }/manifest.json`,
      JSON.stringify( {
        version: 1, durationMs: media.duration_ms,
        intervalMs: Math.round( duration * 1000 / count ),
        width: 320, height: 180, frames
      } )
    );

    await rm( directoryPath, { recursive: true, force: true } );
    await rename( tempDirectoryPath, directoryPath );
  } catch ( error ) {
    await rm( tempDirectoryPath, { recursive: true, force: true } );
    throw error;
  }

  await replaceAsset( media.id, 'scrubber', fingerprint, manifestRelativePath, 320, 180, {
    frameCount: count, durationMs: media.duration_ms
  } );
}

async function processImagePreview ( media: MediaRecord, path: string, fingerprint: string ) : Promise< void > {
  if ( media.media_type !== 'image' || media.file_name?.toLowerCase().endsWith( '.svg' ) ) return;

  const relativePath = `assets/image-previews/${ media.id }-${ fingerprint }.webp`;
  const outputPath = getAssetPath( relativePath );
  const tempPath = outputPath.replace( /\.webp$/i, '.tmp.webp' );

  await mkdir( dirname( outputPath ), { recursive: true } );

  try {
    await runFfmpeg( [
      '-i', path, '-frames:v', '1',
      '-vf', 'scale=640:640:force_original_aspect_ratio=decrease:force_divisible_by=2',
      '-c:v', 'libwebp', '-quality', '80', '-compression_level', '6', '-y', tempPath
    ] );

    await verifySource( media, path );
    await rename( tempPath, outputPath );
  } catch ( error ) {
    await rm( tempPath, { force: true } );
    throw error;
  }

  const dimensions = getScaledDimensions( media.width, media.height, 640, 640 );
  await replaceAsset( media.id, 'image_preview', fingerprint, relativePath, dimensions.width, dimensions.height );
}

async function processWaveform ( media: MediaRecord, path: string, fingerprint: string ) : Promise< void > {
  if ( ! [ 'audio', 'video' ].includes( media.media_type ) || ! media.audio_codec ) return;

  const duration = getDurationSeconds( media );
  const targetPoints = clamp( Math.ceil( duration * 100 ), waveformMinPoints, waveformMaxPoints );
  const samplesPerPoint = Math.max( 1, Math.ceil( waveformSampleRate / ( targetPoints / duration ) ) );
  const estimatedPoints = Math.ceil( duration * waveformSampleRate / samplesPerPoint );

  const output = Buffer.allocUnsafe( 24 + estimatedPoints * 4 );
  Buffer.from( 'FRMWAV1\0', 'ascii' ).copy( output, 0 );
  output.writeUInt32LE( Math.round( waveformSampleRate / samplesPerPoint ), 8 );
  output.writeUInt32LE( 0, 12 );
  output.writeDoubleLE( duration, 16 );

  const child = spawn( 'ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-nostdin', '-i', path, '-map', '0:a:0',
    '-vn', '-ac', '1', '-ar', String( waveformSampleRate ), '-f', 'f32le', 'pipe:1'
  ], { stdio: [ 'ignore', 'pipe', 'pipe' ] } );

  child.stderr.resume();

  const exitPromise = new Promise< number >( ( resolveExit, reject ) => {
    child.once( 'error', reject );
    child.once( 'close', code => resolveExit( code ?? -1 ) );
  } );

  let carry = Buffer.alloc( 0 );
  let pointCount = 0, samplesInPoint = 0;
  let min = Infinity, max = -Infinity;

  function addSample ( sample: number ) : void {
    const value = Number.isFinite( sample ) ? clamp( sample, -1, 1 ) : 0;
    min = Math.min( min, value );
    max = Math.max( max, value );
    samplesInPoint++;

    if ( samplesInPoint < samplesPerPoint ) return;
    writePoint();
  }

  function writePoint () : void {
    if ( pointCount >= estimatedPoints ) return;

    const offset = 24 + pointCount * 4;
    output.writeInt16LE( Math.round( clamp( min, -1, 1 ) * 32767 ), offset );
    output.writeInt16LE( Math.round( clamp( max, -1, 1 ) * 32767 ), offset + 2 );

    pointCount++;
    samplesInPoint = 0;
    min = Infinity;
    max = -Infinity;
  }

  try {
    for await ( const chunk of child.stdout ) {
      const buffer = carry.length ? Buffer.concat( [ carry, chunk as Buffer ] ) : chunk as Buffer;
      const completeLength = buffer.length - buffer.length % 4;

      for ( let offset = 0; offset < completeLength; offset += 4 )
        addSample( buffer.readFloatLE( offset ) );

      carry = buffer.subarray( completeLength );
    }

    if ( samplesInPoint > 0 ) writePoint();

    const exitCode = await exitPromise;
    if ( exitCode !== 0 ) throw new Error( `ffmpeg exited with code ${ exitCode } while generating waveform` );

    await verifySource( media, path );
  } catch ( error ) {
    child.kill( 'SIGTERM' );
    throw error;
  }

  output.writeUInt32LE( pointCount, 12 );

  const relativePath = `assets/waveforms/${ media.id }-${ fingerprint }.bin`;
  const outputPath = getAssetPath( relativePath );
  const tempPath = `${ outputPath }.tmp`;

  await mkdir( dirname( outputPath ), { recursive: true } );

  try {
    await writeFile( tempPath, output.subarray( 0, 24 + pointCount * 4 ) );
    await rename( tempPath, outputPath );
  } catch ( error ) {
    await rm( tempPath, { force: true } );
    throw error;
  }

  await replaceAsset( media.id, 'waveform', fingerprint, relativePath, null, null, {
    format: 'FRMWAV1', durationMs: media.duration_ms, pointCount,
    pointsPerSecond: Math.round( waveformSampleRate / samplesPerPoint ),
    values: 'signed-int16-min-max'
  } );
}


export async function processPosterJob ( job: MediaJob ) : Promise< void > {
  if ( job.job_type !== 'poster' || job.media_id === null ) throw new Error( 'Invalid poster job' );

  const media = await getMediaRecord( job.media_id );
  if ( ! media || ! media.is_available ) return;

  const path = getMediaPath( media );
  await verifySource( media, path );
  await processPoster( media, path, getFingerprint( media ) );
}

export async function processScrubberJob ( job: MediaJob ) : Promise< void > {
  if ( job.job_type !== 'scrubber' || job.media_id === null ) throw new Error( 'Invalid scrubber job' );

  const media = await getMediaRecord( job.media_id );
  if ( ! media || ! media.is_available ) return;

  const path = getMediaPath( media );
  await verifySource( media, path );
  await processScrubber( media, path, getFingerprint( media ) );
}

export async function processImagePreviewJob ( job: MediaJob ) : Promise< void > {
  if ( job.job_type !== 'image_preview' || job.media_id === null ) throw new Error( 'Invalid image preview job' );

  const media = await getMediaRecord( job.media_id );
  if ( ! media || ! media.is_available ) return;

  const path = getMediaPath( media );
  await verifySource( media, path );
  await processImagePreview( media, path, getFingerprint( media ) );
}

export async function processWaveformJob ( job: MediaJob ) : Promise< void > {
  if ( job.job_type !== 'waveform' || job.media_id === null ) throw new Error( 'Invalid waveform job' );

  const media = await getMediaRecord( job.media_id );
  if ( ! media || ! media.is_available ) return;

  const path = getMediaPath( media );
  await verifySource( media, path );
  await processWaveform( media, path, getFingerprint( media ) );
}
