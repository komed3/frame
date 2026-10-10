import { createHash } from 'node:crypto';
import { open, readdir, stat } from 'node:fs/promises';
import { basename, extname, join, relative, sep } from 'node:path';
import { db } from '../db';
import { enqueueJob } from '../jobs/queue';
import type { MediaRoot } from './roots';


type MediaType = 'video' | 'audio' | 'image' | 'text';

interface ScannedFile {
  root: MediaRoot;
  path: string;
  relativePath: string;
  rootRelativePath: string;
  fileName: string;
  type: MediaType;
  mime: string;
  title: string;
  size: number;
  mtimeMs: number;
  hash: string;
}

interface ExistingMedia {
  id: number;
  relative_path: string;
  media_root_id: number | null;
  root_relative_path: string | null;
  file_name: string;
  media_type: MediaType;
  mime_type: string | null;
  title: string | null;
  file_size: number;
  file_mtime_ms: number | null;
  content_hash: string | null;
  metadata_json: string;
  is_available: number;
}

export interface ScanResult {
  discovered: number;
  ignored: number;
  errors: number;
}


const hashVersion = 'partial-sha256-v1', sampleSize = 64 * 1024;
const extensions: Record< string, { type: MediaType, mime: string } > = {};

function registerExtensions ( type: MediaType, mimeTypes: Record< string, string > ) : void {
  for ( const [ extension, mime ] of Object.entries( mimeTypes ) ) extensions[ extension ] = { type, mime };
}

registerExtensions( 'video', {
  '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.mkv': 'video/x-matroska',
  '.mov': 'video/quicktime', '.avi': 'video/x-msvideo', '.webm': 'video/webm',
  '.mpg': 'video/mpeg', '.mpeg': 'video/mpeg', '.mts': 'video/mp2t',
  '.m2ts': 'video/mp2t', '.ts': 'video/mp2t', '.wmv': 'video/x-ms-wmv',
  '.flv': 'video/x-flv', '.ogv': 'video/ogg', '.3gp': 'video/3gpp'
} );

registerExtensions( 'audio', {
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.aac': 'audio/aac',
  '.flac': 'audio/flac', '.ogg': 'audio/ogg', '.opus': 'audio/opus',
  '.wav': 'audio/wav', '.wma': 'audio/x-ms-wma', '.aiff': 'audio/aiff',
  '.aif': 'audio/aiff', '.ape': 'audio/ape', '.mid': 'audio/midi',
  '.midi': 'audio/midi'
} );

registerExtensions( 'image', {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif',
  '.bmp': 'image/bmp', '.tif': 'image/tiff', '.tiff': 'image/tiff',
  '.svg': 'image/svg+xml', '.heic': 'image/heic', '.heif': 'image/heif'
} );

registerExtensions( 'text', {
  '.txt': 'text/plain'
} );


async function hashFile ( path: string, size: number, mtimeMs: number ) : Promise< string > {
  const file = await open( path );

  try {
    const initialStat = await file.stat();

    if ( initialStat.size !== size || initialStat.mtimeMs !== mtimeMs )
      throw new Error( `File changed before hashing: ${ path }` );

    const hash = createHash( 'sha256' );
    hash.update( `${ hashVersion }\0${ size }\0` );

    const offsets = size <= sampleSize ? [ 0 ] : [ 0, Math.floor( ( size - sampleSize ) / 2 ), size - sampleSize ];

    for ( const offset of [ ...new Set( offsets ) ] ) {
      const length = Math.min( sampleSize, size - offset );
      const buffer = Buffer.allocUnsafe( length );
      const { bytesRead } = await file.read( buffer, 0, length, offset );

      if ( bytesRead !== length ) throw new Error( `Incomplete read while hashing: ${ path }` );

      hash.update( `${ offset }\0${ length }\0` );
      hash.update( buffer );
    }

    const finalStat = await file.stat();

    if ( finalStat.size !== size || finalStat.mtimeMs !== mtimeMs )
      throw new Error( `File changed while hashing: ${ path }` );

    return `${ hashVersion }:${ hash.digest( 'hex' ) }`;
  } finally {
    await file.close();
  }
}


export async function scanMediaRoots ( roots: MediaRoot[] ) : Promise< ScanResult > {
  const result: ScanResult = { discovered: 0, ignored: 0, errors: 0 };
  const files: ScannedFile[] = [];
  const rootIds = roots.map( root => root.id );

  const existing = db.prepare( `
    SELECT id, relative_path, media_root_id, root_relative_path,
      file_name, media_type, mime_type, title, file_size,
      file_mtime_ms, content_hash, metadata_json, is_available
    FROM media
  ` ).all() as unknown as ExistingMedia[];

  const existingByPath = new Map( existing.map( media => [ media.relative_path, media ] ) );
  let processed = 0;

  async function scanDirectory ( root: MediaRoot, directory: string ) : Promise< void > {
    let entries;

    try { entries = await readdir( directory, { withFileTypes: true } ) }
    catch ( error ) {
      result.errors++;
      console.error( `Failed to scan directory ${ directory }:`, error );
      return;
    }

    for ( const entry of entries ) {
      const path = join( directory, entry.name );

      if ( entry.isSymbolicLink() ) {
        result.ignored++;
        continue;
      }

      if ( entry.isDirectory() ) {
        await scanDirectory( root, path );
        continue;
      }

      if ( ! entry.isFile() ) {
        result.ignored++;
        continue;
      }

      const fileName = entry.name;
      const extension = extname( fileName ).toLowerCase();
      const media = extensions[ extension ];

      if ( ! media ) {
        result.ignored++;
        continue;
      }

      try {
        const file = await stat( path );
        const rootRelativePath = relative( root.path, path ).split( sep ).join( '/' );
        const relativePath = `${ root.id }/${ rootRelativePath }`;
        const previous = existingByPath.get( relativePath );

        let hash: string;

        if (
          previous?.content_hash?.startsWith( `${ hashVersion }:` ) &&
          previous.file_size === file.size && previous.file_mtime_ms === file.mtimeMs
        ) hash = previous.content_hash;
        else hash = await hashFile( path, file.size, file.mtimeMs );

        files.push( {
          root, path, relativePath, rootRelativePath, fileName,
          type: media.type, mime: media.mime,
          title: basename( fileName, extension ),
          size: file.size, mtimeMs: file.mtimeMs, hash
        } );

        result.discovered++;
      } catch ( error ) {
        result.errors++;
        console.error( `Failed to register media file ${ path }:`, error );
      }

      if ( ++processed % 100 === 0 ) await new Promise( resolve => setImmediate( resolve ) );
    }
  }

  for ( const root of roots ) await scanDirectory( root, root.path );
  if ( result.errors > 0 ) return result;

  const scannedPaths = new Set( files.map( file => file.relativePath ) );
  const hashCounts = new Map< string, number >();

  for ( const file of files ) hashCounts.set( file.hash, ( hashCounts.get( file.hash ) || 0 ) + 1 );
  const existingHashCounts = new Map< string, number >();

  for ( const media of existing ) if ( media.content_hash ) existingHashCounts.set(
    media.content_hash, ( existingHashCounts.get( media.content_hash ) || 0 ) + 1
  );

  const matchedIds = new Set< number >();
  const matchedFiles = new Map< ScannedFile, ExistingMedia >();

  for ( const file of files ) {
    const previous = existingByPath.get( file.relativePath );

    if ( previous ) {
      matchedIds.add( previous.id );
      matchedFiles.set( file, previous );
    }
  }

  for ( const file of files ) {
    if ( matchedFiles.has( file ) ) continue;
    if ( hashCounts.get( file.hash ) !== 1 ) continue;
    if ( existingHashCounts.get( file.hash ) !== 1 ) continue;

    const previous = existing.find( media =>
      media.content_hash === file.hash &&
      rootIds.includes( media.media_root_id as number ) &&
      ! scannedPaths.has( media.relative_path ) &&
      ! matchedIds.has( media.id )
    );

    if ( ! previous ) continue;

    matchedIds.add( previous.id );
    matchedFiles.set( file, previous );
  }

  const updateMedia = db.prepare( `
    UPDATE media SET
      relative_path = ?,
      media_root_id = ?,
      root_relative_path = ?,
      file_name = ?,
      media_type = ?,
      mime_type = ?,
      title = ?,
      file_size = ?,
      file_mtime_ms = ?,
      content_hash = ?,
      is_available = 1,
      missing_since = NULL,
      scanned_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ),
      updated_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )
    WHERE id = ?
  ` );

  const insertMedia = db.prepare( `
    INSERT INTO media (
      relative_path, media_root_id, root_relative_path,
      file_name, media_type, mime_type, title,
      file_size, file_mtime_ms, content_hash,
      is_available, scanned_at
    )
    VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1,
      strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )
    )
  ` );

  db.exec( 'BEGIN IMMEDIATE' );

  try {
    for ( const media of existing ) {
      if ( ! rootIds.includes( media.media_root_id as number ) ) continue;
      if ( scannedPaths.has( media.relative_path ) ) continue;

      db.prepare( `
        UPDATE media
        SET is_available = 0,
            missing_since = COALESCE(
              missing_since,
              strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )
            ),
            updated_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )
        WHERE id = ?
      ` ).run( media.id );
    }

    for ( const file of files ) {
      const previous = matchedFiles.get( file );

      const metadataChanged = ! previous || previous.file_size !== file.size ||
        previous.file_mtime_ms !== file.mtimeMs || previous.content_hash !== file.hash ||
        previous.media_type !== file.type || ! previous.metadata_json ||
        previous.metadata_json === '{}';

      let mediaId: number;

      if ( previous ) {
        updateMedia.run(
          file.relativePath, file.root.id, file.rootRelativePath, file.fileName, file.type,
          file.mime, file.title, file.size, file.mtimeMs, file.hash, previous.id
        );

        mediaId = previous.id;
      } else {
        const inserted = insertMedia.run(
          file.relativePath, file.root.id, file.rootRelativePath, file.fileName, file.type,
          file.mime, file.title, file.size, file.mtimeMs, file.hash
        );

        mediaId = Number( inserted.lastInsertRowid );
      }

      if ( metadataChanged ) enqueueJob( mediaId, 'metadata', 10 );
    }

    const updateRoot = db.prepare( `
      UPDATE media_roots
      SET last_scan_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )
      WHERE id = ?
    ` );

    for ( const root of roots ) updateRoot.run( root.id );

    db.exec( 'COMMIT' );
  } catch ( error ) {
    db.exec( 'ROLLBACK' );
    throw error;
  }

  return result;
}
