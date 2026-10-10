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
