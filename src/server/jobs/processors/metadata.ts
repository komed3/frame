import { execFile } from 'node:child_process';
import { open, stat } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import { db } from '../../db';
import type { MediaJob } from '../queue';


interface MediaRecord {
  id: number;
  media_type: 'video' | 'audio' | 'image' | 'text' | 'other';
  file_size: number;
  file_mtime_ms: number | null;
  root_path: string;
  root_relative_path: string;
  is_available: number;
}

interface ProbeStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  avg_frame_rate?: string;
  r_frame_rate?: string;
  bit_rate?: string;
  sample_rate?: string;
  channels?: number;
  disposition?: {
    attached_pic?: number;
  };
  tags?: Record< string, string | undefined >;
}

interface ProbeFormat {
  format_name?: string;
  duration?: string;
  bit_rate?: string;
  tags?: Record< string, string | undefined >;
}

interface ProbeResult {
  streams?: ProbeStream[];
  format?: ProbeFormat;
}

interface MetadataResult {
  durationMs: number | null;
  width: number | null;
  height: number | null;
  frameRate: number | null;
  bitrate: number | null;
  container: string | null;
  videoCodec: string | null;
  audioCodec: string | null;
  sampleRate: number | null;
  channels: number | null;
  encoding: string | null;
  language: string | null;
  releaseDate: string | null;
  recordedAt: string | null;
  metadata: Record< string, unknown >;
}


const execFileAsync = promisify( execFile );
const textSampleSize = 4096;

const containersByExtension: Record< string, string > = {
  '.3gp': '3gp', '.aac': 'aac', '.aif': 'aiff', '.aiff': 'aiff', '.ape': 'ape',
  '.avi': 'avi', '.avif': 'avif', '.bmp': 'bmp', '.flac': 'flac', '.flv': 'flv',
  '.gif': 'gif', '.heic': 'heic', '.heif': 'heif', '.jpeg': 'jpeg', '.jpg': 'jpeg',
  '.m2ts': 'mpegts', '.m4a': 'mp4', '.m4v': 'mp4', '.midi': 'midi', '.mid': 'midi',
  '.mkv': 'matroska', '.mov': 'mov', '.mp3': 'mp3', '.mp4': 'mp4', '.mpeg': 'mpeg',
  '.mpg': 'mpeg', '.mts': 'mpegts', '.ogg': 'ogg', '.ogv': 'ogg', '.opus': 'opus',
  '.png': 'png', '.svg': 'svg', '.tif': 'tiff', '.tiff': 'tiff', '.ts': 'mpegts',
  '.wav': 'wav', '.webm': 'webm', '.webp': 'webp', '.wma': 'asf', '.wmv': 'asf'
};

const containersByFormat: Record< string, string > = {
  aac: 'aac', aiff: 'aiff', ape: 'ape', asf: 'asf', avi: 'avi', avif: 'avif',
  bmp_pipe: 'bmp', flac: 'flac', flv: 'flv', gif: 'gif', heic: 'heic', heif: 'heif',
  image2: 'image', image2pipe: 'image', jpeg_pipe: 'jpeg', matroska: 'matroska',
  midi: 'midi', mov: 'mov', mp3: 'mp3', mp4: 'mp4', mpeg: 'mpeg', mpegts: 'mpegts',
  ogg: 'ogg', opus: 'opus', png_pipe: 'png', wav: 'wav', webm: 'webm'
};


function numberOrNull ( value: unknown ) : number | null {
  if ( value === null || value === undefined || value === '' ) return null;

  const number = Number( value );
  return Number.isFinite( number ) ? number : null;
}

function positiveNumberOrNull ( value: unknown ) : number | null {
  const number = numberOrNull( value );
  return number !== null && number > 0 ? number : null;
}

function normalizeDate ( value: string | undefined ) : string | null {
  if ( ! value ) return null;

  const compactDate = value.match( /^(\d{4})(\d{2})(\d{2})$/ );
  if ( compactDate ) return `${ compactDate[ 1 ] }-${ compactDate[ 2 ] }-${ compactDate[ 3 ] }`;

  const match = value.match( /^\d{4}(?:-\d{2}(?:-\d{2})?)?/ );
  return match?.[ 0 ] || null;
}

function parseFrameRate ( value: string | undefined ) : number | null {
  if ( ! value ) return null;

  const parts = value.split( '/' ).map( Number );
  if ( parts.length !== 2 || ! Number.isFinite( parts[ 0 ] ) || ! Number.isFinite( parts[ 1 ] ) ) return null;
  if ( parts[ 1 ] === 0 ) return null;

  const rate = parts[ 0 ] / parts[ 1 ];
  return Number.isFinite( rate ) && rate > 0 ? rate : null;
}

function getTag ( tags: Record< string, string | undefined > | undefined, names: string[] ) : string | null {
  if ( ! tags ) return null;

  for ( const name of names ) {
    const entry = Object.entries( tags ).find( ( [ key ] ) => key.toLowerCase() === name );
    if ( entry?.[ 1 ]?.trim() ) return entry[ 1 ].trim();
  }

  return null;
}

function getMetadataDate ( tags: Record< string, string | undefined > | undefined, names: string[] ) : string | null {
  return normalizeDate( getTag( tags, names ) || undefined );
}

function normalizeContainer ( path: string, formatName: string | undefined ) : string | null {
  const extension = extname( path ).toLowerCase();
  if ( containersByExtension[ extension ] ) return containersByExtension[ extension ];

  for ( const format of ( formatName || '' ).split( ',' ) ) {
    const normalized = containersByFormat[ format.trim().toLowerCase() ];
    if ( normalized ) return normalized;
  }

  return null;
}

async function getTextEncoding ( path: string ) : Promise< string > {
  const file = await open( path );

  try {
    const buffer = Buffer.alloc( textSampleSize );
    const { bytesRead } = await file.read( buffer, 0, buffer.length, 0 );
    const sample = buffer.subarray( 0, bytesRead );

    if ( sample.length >= 3 && sample[ 0 ] === 0xEF && sample[ 1 ] === 0xBB && sample[ 2 ] === 0xBF ) return 'UTF-8 BOM';
    if ( sample.length >= 2 && sample[ 0 ] === 0xFF && sample[ 1 ] === 0xFE ) return 'UTF-16 LE';
    if ( sample.length >= 2 && sample[ 0 ] === 0xFE && sample[ 1 ] === 0xFF ) return 'UTF-16 BE';

    try {
      new TextDecoder( 'utf-8', { fatal: true } ).decode( sample );
      return 'UTF-8';
    } catch {
      return 'Windows-1252';
    }
  } finally {
    await file.close();
  }
}

async function probeFile ( path: string ) : Promise< ProbeResult > {
  const result = await execFileAsync(
    'ffprobe', [ '-v', 'error', '-show_format', '-show_streams', '-of', 'json', '-i', path ],
    { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 60_000 }
  );

  return JSON.parse( result.stdout ) as ProbeResult;
}

function makeMetadata ( probe: ProbeResult, mediaType: MediaRecord[ 'media_type' ], path: string ) : MetadataResult {
  const streams = probe.streams || [], format = probe.format || {};

  const videoStream = streams.find( stream =>
    stream.codec_type === 'video' && ! stream.disposition?.attached_pic
  ) || streams.find( stream => stream.codec_type === 'video' );

  const audioStream = streams.find( stream => stream.codec_type === 'audio' );

  const video = mediaType === 'video' ? videoStream : undefined;
  const image = mediaType === 'image' ? videoStream : undefined;
  const audio = mediaType === 'audio' || mediaType === 'video' ? audioStream : undefined;
  const primary = audio || video || image;

  const formatTags = format.tags, streamTags = primary?.tags;
  const language = getTag( audio?.tags, [ 'language' ] ) ||
    getTag( video?.tags, [ 'language' ] ) ||
    getTag( formatTags, [ 'language' ] );

  const compactStreams = streams.map( stream => ( {
    type: stream.codec_type || null,
    codec: stream.codec_name || null,
    attachedPicture: Boolean( stream.disposition?.attached_pic ),
    width: positiveNumberOrNull( stream.width ),
    height: positiveNumberOrNull( stream.height ),
    frameRate: mediaType === 'video'
      ? parseFrameRate( stream.avg_frame_rate ) || parseFrameRate( stream.r_frame_rate )
      : null,
    sampleRate: positiveNumberOrNull( stream.sample_rate ),
    channels: positiveNumberOrNull( stream.channels ),
    bitrate: positiveNumberOrNull( stream.bit_rate ),
    language: getTag( stream.tags, [ 'language' ] ),
    tags: stream.tags || {}
  } ) );

  return {
    durationMs: mediaType === 'video' || mediaType === 'audio'
      ? positiveNumberOrNull( format.duration ) === null
        ? null
        : Math.round( Number( format.duration ) * 1000 )
      : null,
    width: positiveNumberOrNull( video?.width || image?.width ),
    height: positiveNumberOrNull( video?.height || image?.height ),
    frameRate: mediaType === 'video'
      ? parseFrameRate( video?.avg_frame_rate ) || parseFrameRate( video?.r_frame_rate )
      : null,
    bitrate: mediaType === 'video' || mediaType === 'audio'
      ? positiveNumberOrNull( format.bit_rate ) || positiveNumberOrNull( primary?.bit_rate )
      : null,
    container: normalizeContainer( path, format.format_name ),
    videoCodec: video?.codec_name || null,
    audioCodec: audio?.codec_name || null,
    sampleRate: positiveNumberOrNull( audio?.sample_rate ),
    channels: positiveNumberOrNull( audio?.channels ),
    encoding: null,
    language,
    releaseDate: getMetadataDate( formatTags, [ 'date', 'year', 'release_date', 'releasedate' ] ) ||
      getMetadataDate( streamTags, [ 'date', 'year', 'release_date', 'releasedate' ] ),
    recordedAt: getMetadataDate( formatTags, [ 'creation_time', 'recorded_date', 'date_recorded' ] ) ||
      getMetadataDate( streamTags, [ 'creation_time', 'recorded_date', 'date_recorded' ] ),
    metadata: {
      format: {
        name: format.format_name || null,
        tags: formatTags || {}
      },
      normalizedContainer: normalizeContainer( path, format.format_name ),
      streams: compactStreams,
      embeddedTitle: getTag( formatTags, [ 'title' ] ) || getTag( streamTags, [ 'title' ] ),
      embeddedArtist: getTag( formatTags, [ 'artist', 'album_artist', 'performer' ] ),
      embeddedAlbum: getTag( formatTags, [ 'album' ] ),
      embeddedComment: getTag( formatTags, [ 'comment', 'description' ] ),
      mediaType
    }
  };
}

function emptyMetadata ( mediaType: MediaRecord[ 'media_type' ], error?: string ) : MetadataResult {
  return {
    durationMs: null, width: null, height: null, frameRate: null, bitrate: null, container: null,
    videoCodec: null, audioCodec: null, sampleRate: null, channels: null, encoding: null,
    language: null, releaseDate: null, recordedAt: null, metadata: {
      mediaType, ...( error ? { probeError: error } : {} )
    }
  };
}

async function getMediaRecord ( mediaId: number ) : Promise< MediaRecord | undefined > {
  return db.prepare( `
    SELECT
      media.id,
      media.media_type,
      media.file_size,
      media.file_mtime_ms,
      media.is_available,
      media.root_relative_path,
      media_roots.path AS root_path
    FROM media
    JOIN media_roots ON media_roots.id = media.media_root_id
    WHERE media.id = ?
  ` ).get( mediaId ) as MediaRecord | undefined;
}

function getFilePath ( media: MediaRecord ) : string {
  const root = resolve( media.root_path );
  const path = resolve( root, media.root_relative_path );
  const pathFromRoot = relative( root, path );

  if ( pathFromRoot === '..' || pathFromRoot.startsWith( `..${ sep }` ) || isAbsolute( pathFromRoot ) )
    throw new Error( `Media path escapes its root: ${ media.root_relative_path }` );

  return path;
}


export async function processMetadataJob ( job: MediaJob ) : Promise< void > {
  if ( job.job_type !== 'metadata' || job.media_id === null ) throw new Error( 'Invalid metadata job' );

  const media = await getMediaRecord( job.media_id );
  if ( ! media || ! media.is_available ) return;

  const path = getFilePath( media );
  const fileStat = await stat( path );

  if ( fileStat.size !== media.file_size || ( media.file_mtime_ms !== null && fileStat.mtimeMs !== media.file_mtime_ms ) )
    throw new Error( `Media changed since scan; scan it again: ${ path }` );

  let metadata: MetadataResult;

  if ( media.media_type === 'text' ) {
    const encoding = await getTextEncoding( path );
    metadata = { ...emptyMetadata( media.media_type ), encoding, metadata: {
      mediaType: media.media_type, textEncoding: encoding, fileSize: fileStat.size
    } };
  } else {
    try { metadata = makeMetadata( await probeFile( path ), media.media_type, path ) }
    catch ( error ) {
      if ( media.media_type !== 'image' ) throw error;
      metadata = emptyMetadata( media.media_type, error instanceof Error ? error.message : String( error ) );
    }
  }

  db.prepare( `
    UPDATE media SET
      duration_ms = ?,
      width = ?,
      height = ?,
      frame_rate = ?,
      bitrate = ?,
      container = ?,
      video_codec = ?,
      audio_codec = ?,
      sample_rate = ?,
      channels = ?,
      encoding = ?,
      language = ?,
      release_date = ?,
      recorded_at = ?,
      metadata_json = ?,
      updated_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )
    WHERE id = ? AND is_available = 1
  ` ).run(
    metadata.durationMs, metadata.width, metadata.height, metadata.frameRate,
    metadata.bitrate, metadata.container, metadata.videoCodec, metadata.audioCodec,
    metadata.sampleRate, metadata.channels, metadata.encoding, metadata.language,
    metadata.releaseDate, metadata.recordedAt, JSON.stringify( metadata.metadata ),
    media.id
  );
}
