import { execFile } from 'node:child_process';
import { open, stat } from 'node:fs/promises';
import { relative, resolve, sep, isAbsolute } from 'node:path';
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
