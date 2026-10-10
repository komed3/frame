import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
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
