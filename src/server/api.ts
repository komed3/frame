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


// --- public endpoints ---

api.get( '/health', ( _req, res ) => res.json( { status: 'ok' } ) );

api.get( '/auth/setup-status', ( _req, res ) => {
  const row = db.prepare( 'SELECT COUNT(*) AS count FROM users' ).get() as { count: number };
  res.json( { setupRequired: row.count === 0 } );
} );

api.post( '/auth/setup', async ( req, res ) => {
  const body = getBody( req );
  const username = getString( body.username )?.trim();
  const password = getString( body.password );

  if ( ! username || ! /^[a-zA-Z0-9_.-]{3,32}$/.test( username ) )
    fail( 400, 'Username must be 3–32 characters: letters, numbers, dot, underscore or hyphen' );

  if ( ! password || password.length < 12 )
    fail( 400, 'Password must contain at least 12 characters' );

  const passwordHash = await hashPassword( password );
  db.exec( 'BEGIN IMMEDIATE' );

  try {
    const count = db.prepare( 'SELECT COUNT(*) AS count FROM users' ).get() as { count: number };
    if ( count.count > 0 ) fail( 409, 'Initial account has already been created' );

    const existing = db.prepare( 'SELECT id FROM users WHERE username = ?' ).get( username );
    if ( existing ) fail( 409, 'Username is already in use' );

    const result = db.prepare( 'INSERT INTO users ( username, password_hash ) VALUES ( ?, ? )' ).run( username, passwordHash );
    const userId = Number( result.lastInsertRowid );
    const session = createSession( userId );

    db.exec( 'COMMIT' );

    setSessionCookie( res, session.token );
    res.status( 201 ).json( { user: { id: userId, username }, expiresAt: session.expiresAt } );
  } catch ( err ) {
    db.exec( 'ROLLBACK' );
    throw err;
  }
} );

api.post( '/auth/login', async ( req, res ) => {
  const body = getBody( req );
  const username = getString( body.username )?.trim();
  const password = getString( body.password );

  if ( ! username || ! password ) fail( 400, 'Username and password are required' );

  const user = db.prepare( `
    SELECT id, username, password_hash, disabled_at
    FROM users
    WHERE username = ?
  ` ).get( username ) as {
    id: number;
    username: string;
    password_hash: string;
    disabled_at: string | null;
  } | undefined;

  if ( ! user || user.disabled_at !== null || ! await verifyPassword( password, user.password_hash ) )
    fail( 401, 'Invalid username or password' );

  const session = createSession( user.id );

  setSessionCookie( res, session.token );
  res.json( {
    user: { id: user.id, username: user.username },
    expiresAt: session.expiresAt
  } );
} );

api.post( '/auth/logout', ( req, res ) => {
  const token = readSessionToken( req );
  if ( token ) revokeSession( token );

  clearSessionCookie( res );
  res.status( 204 ).end();
} );


// --- authenticated endpoints ---

api.use( requireSession );

api.get( '/auth/me', ( req, res ) => {
  res.json( {
    user: { id: req.user!.id, username: req.user!.username },
    sessionId: req.user!.sessionId
  } );
} );


// --- roots ---

api.get( '/roots', ( _req, res ) => {
  const roots = db.prepare( `
    SELECT roots.id, roots.path, roots.enabled, roots.last_scan_at AS lastScanAt,
      roots.created_at AS createdAt, COUNT( media.id ) AS mediaCount
    FROM media_roots AS roots
    LEFT JOIN media ON media.media_root_id = roots.id AND media.is_available = 1
    GROUP BY roots.id
    ORDER BY roots.id
  ` ).all();

  res.json( { items: roots } );
} );


api.post( '/roots', ( req, res ) => {
  const body = getBody( req );
  const path = getString( body.path )?.trim();

  if ( ! path ) fail( 400, 'Root path is required' );

  let id: number;

  try { id = mediaRoots.add( path ) }
  catch ( err ) {
    const message = err instanceof Error ? err.message : 'Invalid root path';
    fail( 400, message );
  }

  const root = db.prepare( `
    SELECT id, path, enabled, last_scan_at AS lastScanAt, created_at AS createdAt
    FROM media_roots
    WHERE id = ?
  ` ).get( id );

  res.status( 201 ).json( { root } );
} );


api.patch( '/roots/:id', ( req, res ) => {
  const id = routeId( req.params.id );
  const body = getBody( req );

  if ( typeof body.enabled !== 'boolean' ) fail( 400, 'The enabled property must be a boolean' );

  const existing = db.prepare( 'SELECT id FROM media_roots WHERE id = ?' ).get( id );
  if ( ! existing ) fail( 404, 'Media root not found' );

  mediaRoots.setEnabled( id, body.enabled );
  res.json( { id, enabled: body.enabled } );
} );


api.delete( '/roots/:id', ( req, res ) => {
  const id = routeId( req.params.id );
  const existing = db.prepare( 'SELECT id FROM media_roots WHERE id = ?' ).get( id );
  if ( ! existing ) fail( 404, 'Media root not found' );

  const count = db.prepare( `
    SELECT COUNT(*) AS count
    FROM media
    WHERE media_root_id = ?
  ` ).get( id ) as { count: number };

  if ( count.count > 0 ) fail( 409, 'This root still has media records. Disable it instead or remove its media records first.' );
  db.prepare( 'DELETE FROM media_roots WHERE id = ?' ).run( id );
  res.status( 204 ).end();
} );


// --- jobs ---

api.get( '/jobs', ( req, res ) => {
  const conditions: string[] = [];
  const params: Array< string | number > = [];

  const status = getString( req.query.status );
  const type = getString( req.query.type );
  const mediaIdValue = getString( req.query.mediaId );

  if ( status ) {
    if ( ! jobStatuses.includes( status as MediaJobStatus ) ) fail( 400, 'Invalid job status' );

    conditions.push( 'status = ?' );
    params.push( status );
  }

  if ( type ) {
    if ( ! jobTypes.includes( type as MediaJobType ) ) fail( 400, 'Invalid job type' );

    conditions.push( 'job_type = ?' );
    params.push( type );
  }

  if ( mediaIdValue !== undefined ) {
    if ( mediaIdValue === 'null' ) conditions.push( 'media_id IS NULL' );
    else {
      const mediaId = getInteger( mediaIdValue );
      if ( mediaId === undefined ) fail( 400, 'Invalid mediaId' );

      conditions.push( 'media_id = ?' );
      params.push( mediaId );
    }
  }

  const limit = getInteger( getString( req.query.limit ), 1, 200 ) ?? 50;
  const offset = getInteger( getString( req.query.offset ), 0 ) ?? 0;
  const where = conditions.length ? `WHERE ${ conditions.join( ' AND ' ) }` : '';

  const count = db.prepare( `
    SELECT COUNT(*) AS count
    FROM media_jobs
    ${ where }
  ` ).get( ...params ) as { count: number };

  const items = db.prepare( `
    SELECT id, media_id, job_type, status, priority, attempts, max_attempts,
      available_at_ms, locked_at_ms, last_error, created_at, updated_at
    FROM media_jobs
    ${ where }
    ORDER BY
      CASE status
        WHEN 'running' THEN 0
        WHEN 'pending' THEN 1
        WHEN 'failed' THEN 2
        ELSE 3
      END,
      priority DESC, created_at DESC, id DESC
    LIMIT ? OFFSET ?
  ` ).all( ...params, limit, offset ) as unknown as JobRecord[];

  res.json( { items: items.map( serializeJob ), total: count.count, limit, offset } );
} );


api.post( '/jobs', ( req, res ) => {
  const body = getBody( req );
  const type = getString( body.type );

  if ( ! type || ! jobTypes.includes( type as MediaJobType ) ) fail( 400, 'Invalid job type' );

  const jobType = type as MediaJobType;
  const rawMediaId = body.mediaId;
  let mediaId: number | null = null;

  if ( jobType === 'scan' ) {
    if ( rawMediaId !== undefined && rawMediaId !== null )
      fail( 400, 'Scan jobs are global and must not specify mediaId' );
  } else {
    if ( typeof rawMediaId !== 'number' || ! Number.isSafeInteger( rawMediaId ) || rawMediaId < 1 )
      fail( 400, 'A positive mediaId is required for this job type' );

    mediaId = rawMediaId;

    const media = db.prepare( 'SELECT id, is_available FROM media WHERE id = ?' ).get( mediaId ) as {
      id: number, is_available: number;
    } | undefined;

    if ( ! media ) fail( 404, 'Media not found' );
    if ( media.is_available !== 1 ) fail( 409, 'Media is unavailable' );
  }

  const priority = body.priority === undefined ? 0 : body.priority;
  if ( typeof priority !== 'number' || ! Number.isSafeInteger( priority ) || priority < -100 || priority > 100 )
    fail( 400, 'Priority must be an integer between -100 and 100' );

  const retryFailed = body.retryFailed === undefined ? false : body.retryFailed;
  if ( typeof retryFailed !== 'boolean' ) fail( 400, 'retryFailed must be a boolean' );

  enqueueJob( mediaId, jobType, priority, retryFailed );

  const job = db.prepare( `
    SELECT id, media_id, job_type, status, priority, attempts, max_attempts,
      available_at_ms, locked_at_ms, last_error, created_at, updated_at
    FROM media_jobs
    WHERE job_type = ?
      AND ${ mediaId === null ? 'media_id IS NULL' : 'media_id = ?' }
  ` ).get( ...[ jobType, ...( mediaId === null ? [] : [ mediaId ] ) ] ) as JobRecord | undefined;

  if ( ! job ) fail( 500, 'Could not retrieve the queued job' );
  res.status( 202 ).json( { job: serializeJob( job ) } );
} );


api.get( '/jobs/:id', ( req, res ) => {
  const id = routeId( req.params.id );
  const job = getJobRecord( id );

  if ( ! job ) fail( 404, 'Job not found' );
  res.json( { job: serializeJob( job ) } );
} );


api.post( '/jobs/:id/retry', ( req, res ) => {
  const id = routeId( req.params.id );
  const job = getJobRecord( id );

  if ( ! job ) fail( 404, 'Job not found' );
  if ( job.status === 'running' ) fail( 409, 'A running job cannot be retried' );

  if ( job.status === 'pending' ) {
    res.json( { job: serializeJob( job ) } );
    return;
  }

  enqueueJob( job.media_id, job.job_type, job.priority, true );

  const updated = getJobRecord( id );
  if ( ! updated ) fail( 404, 'Job not found after retry' );

  res.status( 202 ).json( { job: serializeJob( updated ) } );
} );


// --- stats ---

api.get( '/stats', ( _req, res ) => {
  const media = db.prepare( `
    SELECT COUNT(*) AS total,
      SUM( CASE WHEN is_available = 1 THEN 1 ELSE 0 END ) AS available,
      SUM( CASE WHEN is_available = 0 THEN 1 ELSE 0 END ) AS unavailable,
      COALESCE( SUM( file_size ), 0 ) AS totalBytes,
      COALESCE( SUM( duration_ms ), 0 ) AS totalDurationMs
    FROM media
  ` ).get() as {
    total: number;
    available: number;
    unavailable: number;
    totalBytes: number;
    totalDurationMs: number;
  };

  const mediaByType = db.prepare( `
    SELECT media_type AS type, COUNT(*) AS count
    FROM media
    GROUP BY media_type
    ORDER BY media_type
  ` ).all() as Array< { type: MediaType, count: number } >;

  const roots = db.prepare( `
    SELECT COUNT(*) AS total,
      SUM( CASE WHEN enabled = 1 THEN 1 ELSE 0 END ) AS enabled
    FROM media_roots
  ` ).get() as { total: number, enabled: number };

  const assets = db.prepare( 'SELECT COUNT(*) AS count FROM media_assets' ).get() as { count: number };

  const jobs = db.prepare( `
    SELECT status, COUNT(*) AS count
    FROM media_jobs
    GROUP BY status
  ` ).all() as Array< { status: MediaJobStatus, count: number } >;

  res.json( {
    collectedAt: new Date().toISOString(),
    media: {
      total: media.total,
      available: media.available ?? 0,
      unavailable: media.unavailable ?? 0,
      totalBytes: media.totalBytes,
      totalDurationMs: media.totalDurationMs,
      byType: mediaByType
    },
    roots: {
      total: roots.total,
      enabled: roots.enabled ?? 0
    },
    assets: { total: assets.count },
    jobs: Object.fromEntries( jobStatuses.map( status => [
      status, jobs.find( job => job.status === status )?.count ?? 0
    ] ) )
  } );
} );


// --- media search and retrieval ---

api.get( '/media', ( req, res ) => {
  const conditions: string[] = [];
  const params: Array< string | number > = [];

  const q = getString( req.query.q )?.trim();
  const type = getString( req.query.type );
  const rootIdValue = getString( req.query.rootId );
  const available = getString( req.query.available ) ?? 'true';

  if ( q ) {
    if ( q.length > 200 ) fail( 400, 'Search query is too long' );

    const escaped = q.replace( /[\\%_]/g, '\\$&' );
    const pattern = `%${ escaped }%`;

    conditions.push( `(
      media.title LIKE ? ESCAPE '\\'
      OR media.file_name LIKE ? ESCAPE '\\'
      OR media.description LIKE ? ESCAPE '\\'
      OR media.relative_path LIKE ? ESCAPE '\\'
    )` );

    params.push( pattern, pattern, pattern, pattern );
  }

  if ( type ) {
    if ( ! mediaTypes.includes( type as MediaType ) ) fail( 400, 'Invalid media type' );

    conditions.push( 'media.media_type = ?' );
    params.push( type );
  }

  if ( rootIdValue !== undefined ) {
    const rootId = getInteger( rootIdValue );
    if ( rootId === undefined ) fail( 400, 'Invalid rootId' );

    conditions.push( 'media.media_root_id = ?' );
    params.push( rootId );
  }

  if ( available === 'true' ) conditions.push( 'media.is_available = 1' );
  else if ( available === 'false' ) conditions.push( 'media.is_available = 0' );
  else if ( available !== 'all' ) fail( 400, 'available must be true, false or all' );

  const sort = getString( req.query.sort ) ?? 'title';
  const direction = ( getString( req.query.direction ) ?? 'asc' ).toLowerCase();

  const sortColumns: Record< string, string > = {
    title: 'media.title COLLATE NOCASE',
    fileName: 'media.file_name COLLATE NOCASE',
    createdAt: 'media.created_at',
    updatedAt: 'media.updated_at',
    duration: 'media.duration_ms',
    size: 'media.file_size',
    releaseDate: 'media.release_date'
  };

  if ( ! sortColumns[ sort ] ) fail( 400, 'Invalid sort field' );
  if ( direction !== 'asc' && direction !== 'desc' ) fail( 400, 'direction must be asc or desc' );

  const limit = getInteger( getString( req.query.limit ), 1, 100 ) ?? 40;
  const offset = getInteger( getString( req.query.offset ), 0 ) ?? 0;
  const where = conditions.length ? `WHERE ${ conditions.join( ' AND ' ) }` : '';

  const count = db.prepare( `
    SELECT COUNT(*) AS count
    FROM media
    ${ where }
  ` ).get( ...params ) as { count: number };

  const rows = db.prepare( `
    SELECT media.*, media_roots.path AS root_path,
      poster.relative_path AS poster_asset,
      thumb.relative_path AS thumb_asset
    FROM media
    LEFT JOIN media_roots ON media_roots.id = media.media_root_id
    LEFT JOIN media_assets AS poster
      ON poster.media_id = media.id AND poster.asset_type = 'poster'
    LEFT JOIN media_assets AS thumb
      ON thumb.media_id = media.id AND thumb.asset_type = 'thumb'
    ${ where }
    ORDER BY ${ sortColumns[ sort ] } ${ direction.toUpperCase() }, media.id DESC
    LIMIT ? OFFSET ?
  ` ).all( ...params, limit, offset ) as unknown as Array< MediaRecord & {
    poster_asset: string | null;
    thumb_asset: string | null;
  } >;

  res.json( { items: rows.map( media => ( {
    ...serializeMedia( media ),
    posterUrl: media.poster_asset
      ? `/api/media/${ media.id }/assets/poster`
      : media.thumb_asset ? `/api/media/${ media.id }/assets/thumb` : null,
    thumbUrl: media.thumb_asset ? `/api/media/${ media.id }/assets/thumb` : null
  } ) ), total: count.count, limit, offset, sort, direction } );
} );

api.get( '/media/:id', ( req, res ) => {
  const id = routeId( req.params.id );
  const media = getMediaRecord( id );

  if ( ! media ) fail( 404, 'Media not found' );
  const assets = getAssetRecords( id );

  res.json( {
    media: serializeMedia( media ),
    assets: assets.map( serializeAsset ),
    streamUrl: `/api/media/${ id }/stream`
  } );
} );

api.get( '/media/:id/meta', ( req, res ) => {
  const id = routeId( req.params.id );
  const media = getMediaRecord( id );

  if ( ! media ) fail( 404, 'Media not found' );

  res.json( {
    id: media.id,
    type: media.media_type,
    metadata: parseJson( media.metadata_json ),
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
    recordedAt: media.recorded_at
  } );
} );

api.get( '/media/:id/assets', ( req, res ) => {
  const id = routeId( req.params.id );
  if ( ! getMediaRecord( id ) ) fail( 404, 'Media not found' );

  res.json( { items: getAssetRecords( id ).map( serializeAsset ) } );
} );

api.get( '/media/:id/assets/:type', async ( req, res ) => {
  const id = routeId( req.params.id );
  const type = req.params.type as MediaAssetType;

  if ( ! assetTypes.includes( type ) ) fail( 400, 'Invalid asset type' );
  if ( ! getMediaRecord( id ) ) fail( 404, 'Media not found' );

  const asset = db.prepare( `
    SELECT id, media_id, asset_type, relative_path, width, height, metadata_json, created_at
    FROM media_assets
    WHERE media_id = ? AND asset_type = ?
  ` ).get( id, type ) as AssetRecord | undefined;

  if ( ! asset ) fail( 404, 'Asset not found' );

  if ( type === 'frames' ) {
    const manifest = await getFramesManifest( asset );

    res.setHeader( 'Cache-Control', 'private, no-store' );
    res.json( {
      version: manifest.version,
      durationMs: manifest.durationMs,
      intervalMs: manifest.intervalMs,
      width: manifest.width,
      height: manifest.height,
      frames: manifest.frames.map( frame => ( {
        index: frame.index,
        timeMs: frame.timeMs,
        url: `/api/media/${ id }/frames/${ frame.index }`
      } ) )
    } );

    return;
  }

  const contentType = type === 'wave' ? 'application/octet-stream'
    : type === 'text' ? 'text/plain; charset=utf-8' : 'image/webp';

  sendAssetFile( getAssetPath( asset ), res, contentType );
} );

api.get( '/media/:id/frames/:index', async ( req, res ) => {
  const id = routeId( req.params.id );
  const index = getInteger( req.params.index, 0 );

  if ( index === undefined ) fail( 400, 'Invalid frame index' );
  if ( ! getMediaRecord( id ) ) fail( 404, 'Media not found' );

  const asset = db.prepare( `
    SELECT id, media_id, asset_type, relative_path, width, height, metadata_json, created_at
    FROM media_assets
    WHERE media_id = ? AND asset_type = 'frames'
  ` ).get( id ) as AssetRecord | undefined;

  if ( ! asset ) fail( 404, 'Frames asset not found' );

  const manifest = await getFramesManifest( asset );
  const frame = manifest.frames.find( item => item.index === index );
  if ( ! frame ) fail( 404, 'Frame not found' );
  const path = assetStorage.absolutePath( frame.path );

  try {
    const info = await stat( path );
    if ( ! info.isFile() ) fail( 404, 'Frame file not found' );
  } catch {
    fail( 404, 'Frame file not found' );
  }

  sendAssetFile( path, res, 'image/webp' );
} );

api.get( '/media/:id/stream', streamMedia );
api.head( '/media/:id/stream', streamMedia );


// --- per-user playback progress ---


api.get( '/media/:id/progress', ( req, res ) => {
  const mediaId = routeId( req.params.id );
  const userId = req.user!.id;

  if ( ! getMediaRecord( mediaId ) ) fail( 404, 'Media not found' );

  const progress = db.prepare( `
    SELECT position_ms, completed, updated_at
    FROM playback_progress
    WHERE user_id = ? AND media_id = ?
  ` ).get( userId, mediaId ) as {
    position_ms: number;
    completed: number;
    updated_at: string;
  } | undefined;

  res.json( {
    mediaId,
    positionMs: progress?.position_ms ?? 0,
    completed: progress?.completed === 1,
    updatedAt: progress?.updated_at ?? null
  } );
} );

api.put( '/media/:id/progress', ( req, res ) => {
  const mediaId = routeId( req.params.id );
  const userId = req.user!.id;
  const body = getBody( req );

  if ( ! getMediaRecord( mediaId ) ) fail( 404, 'Media not found' );
  const positionMs = body.positionMs;

  if ( typeof positionMs !== 'number' || ! Number.isSafeInteger( positionMs ) || positionMs < 0 )
    fail( 400, 'positionMs must be a non-negative integer' );

  const completed = body.completed === undefined ? false : body.completed;
  if ( typeof completed !== 'boolean' ) fail( 400, 'completed must be a boolean' );

  db.prepare( `
    INSERT INTO playback_progress ( user_id, media_id, position_ms, completed )
    VALUES ( ?, ?, ?, ? )
    ON CONFLICT ( user_id, media_id ) DO UPDATE SET
      position_ms = excluded.position_ms,
      completed = excluded.completed,
      updated_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )
  ` ).run( userId, mediaId, positionMs, completed ? 1 : 0 );

  res.json( { mediaId, positionMs, completed } );
} );
