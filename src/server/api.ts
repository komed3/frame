import { db } from '@/src/server/db';
import {
  clearSessionCookie, createSession, hashPassword, readSessionToken,
  requireSession, revokeSession, setSessionCookie, verifyPassword
} from '@/src/server/auth';
import { jobQueue, enqueueJob } from '@/src/server/jobs/queue';
import { assetStorage } from '@/src/server/media/assets';
import { mediaRoots } from '@/src/server/media/roots';
import type {
  FramesManifest, MediaAssetType, MediaJobStatus, MediaJobType, MediaType
} from '@/src/shared/types';
import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';


interface MediaRecord {
  id: number;
  relative_path: string;
  media_root_id: number | null;
  root_relative_path: string | null;
  file_name: string;
  media_type: MediaType;
  mime_type: string | null;
  title: string | null;
  description: string | null;
  file_size: number;
  file_mtime_ms: number | null;
  content_hash: string | null;
  is_available: number;
  missing_since: string | null;
  duration_ms: number | null;
  width: number | null;
  height: number | null;
  frame_rate: number | null;
  bitrate: number | null;
  container: string | null;
  video_codec: string | null;
  audio_codec: string | null;
  sample_rate: number | null;
  channels: number | null;
  encoding: string | null;
  language: string | null;
  release_date: string | null;
  recorded_at: string | null;
  metadata_json: string;
  scanned_at: string | null;
  created_at: string;
  updated_at: string;
  root_path: string | null;
}

interface JobRecord {
  id: number;
  media_id: number | null;
  job_type: MediaJobType;
  status: MediaJobStatus;
  priority: number;
  attempts: number;
  max_attempts: number;
  available_at_ms: number;
  locked_at_ms: number | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

interface AssetRecord {
  id: number;
  media_id: number;
  asset_type: MediaAssetType;
  relative_path: string;
  width: number | null;
  height: number | null;
  metadata_json: string;
  created_at: string;
}

interface ByteRange {
  start: number;
  end: number;
}


const api = Router();

const mediaTypes: MediaType[] = [ 'video', 'audio', 'image', 'text' ];
const assetTypes: MediaAssetType[] = [ 'poster', 'thumb', 'frames', 'wave', 'text' ];
const jobTypes: MediaJobType[] = [ 'scan', 'metadata', ...assetTypes ];
const jobStatuses: MediaJobStatus[] = [ 'pending', 'running', 'completed', 'failed' ];


class ApiError extends Error {
  public constructor ( public readonly status: number, message: string ) {
    super( message );
  }
}


function fail ( status: number, message: string ) : never {
  throw new ApiError( status, message );
}

function getString ( value: unknown ) : string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function getInteger ( value: unknown, min = 1, max = Number.MAX_SAFE_INTEGER ) : number | undefined {
  if ( typeof value !== 'string' && typeof value !== 'number' ) return;

  const parsed = typeof value === 'number' ? value : Number( value );
  return Number.isSafeInteger( parsed ) && parsed >= min && parsed <= max ? parsed : undefined;
}

function routeId ( value: string | undefined, name = 'id' ) : number {
  const id = getInteger( value );

  if ( id === undefined ) fail( 400, `Invalid ${ name }` );
  return id;
}

function getBody ( req: Request ) : Record< string, unknown > {
  if ( ! req.body || typeof req.body !== 'object' || Array.isArray( req.body ) )
    fail( 400, 'A JSON object is required' );

  return req.body as Record< string, unknown >;
}

function parseJson ( value: string ) : unknown {
  try { return JSON.parse( value ) }
  catch { return {} }
}

function getMediaRecord ( id: number ) : MediaRecord | undefined {
  return db.prepare( `
    SELECT media.*, media_roots.path AS root_path
    FROM media
    LEFT JOIN media_roots ON media_roots.id = media.media_root_id
    WHERE media.id = ?
  ` ).get( id ) as MediaRecord | undefined;
}

function serializeMedia ( media: MediaRecord ) {
  return {
    id: media.id,
    relativePath: media.relative_path,
    rootId: media.media_root_id,
    rootRelativePath: media.root_relative_path,
    fileName: media.file_name,
    type: media.media_type,
    mimeType: media.mime_type,
    title: media.title,
    description: media.description,
    fileSize: media.file_size,
    fileMtimeMs: media.file_mtime_ms,
    contentHash: media.content_hash,
    available: media.is_available === 1,
    missingSince: media.missing_since,
    durationMs: media.duration_ms,
    width: media.width,
    height: media.height,
    frameRate: media.frame_rate,
    bitrate: media.bitrate,
    container: media.container,
    videoCodec: media.video_codec,
    audioCodec: media.audio_codec,
    sampleRate: media.sample_rate,
    channels: media.channels,
    encoding: media.encoding,
    language: media.language,
    releaseDate: media.release_date,
    recordedAt: media.recorded_at,
    metadata: parseJson( media.metadata_json ),
    scannedAt: media.scanned_at,
    createdAt: media.created_at,
    updatedAt: media.updated_at
  };
}

function getJobRecord ( id: number ) : JobRecord | undefined {
  return db.prepare( `
    SELECT id, media_id, job_type, status, priority, attempts, max_attempts,
      available_at_ms, locked_at_ms, last_error, created_at, updated_at
    FROM media_jobs
    WHERE id = ?
  ` ).get( id ) as JobRecord | undefined;
}

function serializeJob ( job: JobRecord ) {
  return {
    id: job.id,
    mediaId: job.media_id,
    type: job.job_type,
    status: job.status,
    priority: job.priority,
    attempts: job.attempts,
    maxAttempts: job.max_attempts,
    availableAtMs: job.available_at_ms,
    lockedAtMs: job.locked_at_ms,
    lastError: job.last_error,
    createdAt: job.created_at,
    updatedAt: job.updated_at
  };
}

function getAssetRecords ( mediaId: number ) : AssetRecord[] {
  return db.prepare( `
    SELECT id, media_id, asset_type, relative_path, width, height, metadata_json, created_at
    FROM media_assets
    WHERE media_id = ?
    ORDER BY asset_type
  ` ).all( mediaId ) as unknown as AssetRecord[];
}

function serializeAsset ( asset: AssetRecord ) {
  return {
    id: asset.id,
    mediaId: asset.media_id,
    type: asset.asset_type,
    width: asset.width,
    height: asset.height,
    metadata: parseJson( asset.metadata_json ),
    createdAt: asset.created_at,
    url: `/api/media/${ asset.media_id }/assets/${ asset.asset_type }`
  };
}

function getMediaSourcePath ( media: MediaRecord ) : string {
  if ( ! media.root_path || ! media.root_relative_path )
    fail( 409, 'The media file has no registered source path' );

  const root = resolve( media.root_path );
  const path = resolve( root, media.root_relative_path );
  const fromRoot = relative( root, path );

  if ( ! fromRoot || fromRoot === '..' || fromRoot.startsWith( `..${ sep }` ) )
    fail( 500, 'The media path is outside its registered root' );

  return path;
}

function getAssetPath ( asset: AssetRecord ) : string {
  return assetStorage.absolutePath( asset.relative_path );
}

function sendAssetFile ( path: string, res: Response, contentType?: string ) : void {
  res.setHeader( 'Cache-Control', 'private, no-store' );
  if ( contentType ) res.setHeader( 'Content-Type', contentType );

  res.sendFile( path, err => {
    if ( ! err ) return;
    if ( res.headersSent ) { res.destroy( err ); return }

    res.status( 404 ).json( { error: 'Asset file not found' } );
  } );
}

function parseByteRange ( value: string, size: number ) : ByteRange | undefined {
  const match = value.match( /^bytes=(\d*)-(\d*)$/ );
  if ( ! match || size <= 0 || ( ! match[ 1 ] && ! match[ 2 ] ) ) return;

  let start: number, end: number;

  if ( ! match[ 1 ] ) {
    const suffixLength = Number( match[ 2 ] );
    if ( ! Number.isSafeInteger( suffixLength ) || suffixLength <= 0 ) return;

    start = Math.max( 0, size - suffixLength );
    end = size - 1;
  } else {
    start = Number( match[ 1 ] );
    end = match[ 2 ] ? Number( match[ 2 ] ) : size - 1;
    if ( ! Number.isSafeInteger( start ) || ! Number.isSafeInteger( end ) || start < 0 || end < start || start >= size ) return;

    end = Math.min( end, size - 1 );
  }

  return { start, end };
}


async function streamMedia ( req: Request, res: Response ) : Promise< void > {
  const id = routeId( ( req.params as any ).id );
  const media = getMediaRecord( id );

  if ( ! media ) { res.status( 404 ).json( { error: 'Media not found' } ); return }
  if ( media.is_available !== 1 ) { res.status( 410 ).json( { error: 'Media is unavailable' } ); return }

  const path = getMediaSourcePath( media );
  let info;

  try { info = await stat( path ) }
  catch {
    res.status( 410 ).json( { error: 'Media file is missing' } );
    return;
  }

  if ( ! info.isFile() ) {
    res.status( 410 ).json( { error: 'Media file is not a regular file' } );
    return;
  }

  res.setHeader( 'Accept-Ranges', 'bytes' );
  res.setHeader( 'Content-Type', media.mime_type || 'application/octet-stream' );
  res.setHeader( 'Content-Disposition', 'inline' );
  res.setHeader( 'Cache-Control', 'private, no-store' );
  res.setHeader( 'X-Content-Type-Options', 'nosniff' );

  if ( info.size === 0 ) {
    res.status( 200 ).setHeader( 'Content-Length', '0' );
    res.end();
    return;
  }

  const rangeHeader = req.headers.range;
  let start = 0, end = info.size - 1;

  if ( rangeHeader ) {
    const range = parseByteRange( rangeHeader, info.size );

    if ( ! range ) {
      res.status( 416 ).setHeader( 'Content-Range', `bytes */${ info.size }` );
      res.end();
      return;
    }

    start = range.start;
    end = range.end;

    res.status( 206 );
    res.setHeader( 'Content-Range', `bytes ${ start }-${ end }/${ info.size }` );
  }

  res.setHeader( 'Content-Length', String( end - start + 1 ) );
  if ( req.method === 'HEAD' ) { res.end(); return }

  const stream = createReadStream( path, { start, end } );

  stream.on( 'error', err => {
    if ( res.headersSent ) res.destroy( err );
    else res.status( 500 ).json( { error: 'Unable to read media file' } );
  } );

  stream.pipe( res );
}

function getFramesManifest ( asset: AssetRecord ) : Promise< FramesManifest > {
  return readFile( getAssetPath( asset ), 'utf8' ).then( value => JSON.parse( value ) as FramesManifest );
}
