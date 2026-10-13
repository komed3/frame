import { db } from '@/src/server/db';
import { enqueueJob } from '@/src/server/jobs/queue';
import type { ExistingMedia, MediaRoot, MediaType, ScannedFile, ScanResult } from '@/src/shared/types';
import { createHash } from 'node:crypto';
import { open, readdir, stat } from 'node:fs/promises';
import { basename, extname, join, relative, sep } from 'node:path';


const hashVersion = 'partial-sha256-v1', sampleSize = 64 * 1024;
const extensions: Record< string, { type: MediaType, mime: string } > = {
  '.mp4': { type: 'video', mime: 'video/mp4' },
  '.m4v': { type: 'video', mime: 'video/mp4' },
  '.mkv': { type: 'video', mime: 'video/x-matroska' },
  '.mov': { type: 'video', mime: 'video/quicktime' },
  '.avi': { type: 'video', mime: 'video/x-msvideo' },
  '.webm': { type: 'video', mime: 'video/webm' },
  '.mpg': { type: 'video', mime: 'video/mpeg' },
  '.mpeg': { type: 'video', mime: 'video/mpeg' },
  '.mts': { type: 'video', mime: 'video/mp2t' },
  '.m2ts': { type: 'video', mime: 'video/mp2t' },
  '.ts': { type: 'video', mime: 'video/mp2t' },
  '.wmv': { type: 'video', mime: 'video/x-ms-wmv' },
  '.flv': { type: 'video', mime: 'video/x-flv' },
  '.ogv': { type: 'video', mime: 'video/ogg' },
  '.3gp': { type: 'video', mime: 'video/3gpp' },
  '.mp3': { type: 'audio', mime: 'audio/mpeg' },
  '.m4a': { type: 'audio', mime: 'audio/mp4' },
  '.aac': { type: 'audio', mime: 'audio/aac' },
  '.flac': { type: 'audio', mime: 'audio/flac' },
  '.ogg': { type: 'audio', mime: 'audio/ogg' },
  '.opus': { type: 'audio', mime: 'audio/opus' },
  '.wav': { type: 'audio', mime: 'audio/wav' },
  '.wma': { type: 'audio', mime: 'audio/x-ms-wma' },
  '.aiff': { type: 'audio', mime: 'audio/aiff' },
  '.aif': { type: 'audio', mime: 'audio/aiff' },
  '.ape': { type: 'audio', mime: 'audio/ape' },
  '.mid': { type: 'audio', mime: 'audio/midi' },
  '.midi': { type: 'audio', mime: 'audio/midi' },
  '.jpg': { type: 'image', mime: 'image/jpeg' },
  '.jpeg': { type: 'image', mime: 'image/jpeg' },
  '.png': { type: 'image', mime: 'image/png' },
  '.gif': { type: 'image', mime: 'image/gif' },
  '.webp': { type: 'image', mime: 'image/webp' },
  '.avif': { type: 'image', mime: 'image/avif' },
  '.bmp': { type: 'image', mime: 'image/bmp' },
  '.tif': { type: 'image', mime: 'image/tiff' },
  '.tiff': { type: 'image', mime: 'image/tiff' },
  '.svg': { type: 'image', mime: 'image/svg+xml' },
  '.heic': { type: 'image', mime: 'image/heic' },
  '.heif': { type: 'image', mime: 'image/heif' },
  '.txt': { type: 'text', mime: 'text/plain' }
};


export class MediaScanner {
  private async hashFile ( path: string, size: number, mtimeMs: number, signal: AbortSignal ) : Promise< string > {
    signal.throwIfAborted();
    const file = await open( path );

    try {
      signal.throwIfAborted();
      const initialStat = await file.stat();

      if ( initialStat.size !== size || initialStat.mtimeMs !== mtimeMs )
        throw new Error( `File changed before hashing: ${ path }` );

      const hash = createHash( 'sha256' );
      hash.update( `${ hashVersion }\0${ size }\0` );

      const offsets = size <= sampleSize ? [ 0 ] : [
        0, Math.floor( ( size - sampleSize ) / 2 ), size - sampleSize
      ];

      for ( const offset of [ ...new Set( offsets ) ] ) {
        signal.throwIfAborted();

        const length = Math.min( sampleSize, size - offset );
        const buffer = Buffer.allocUnsafe( length );
        const { bytesRead } = await file.read( buffer, 0, length, offset );

        signal.throwIfAborted();

        if ( bytesRead !== length ) throw new Error( `Incomplete read while hashing: ${ path }` );

        hash.update( `${ offset }\0${ length }\0` );
        hash.update( buffer );
      }

      const finalStat = await file.stat();
      signal.throwIfAborted();

      if ( finalStat.size !== size || finalStat.mtimeMs !== mtimeMs )
        throw new Error( `File changed while hashing: ${ path }` );

      return `${ hashVersion }:${ hash.digest( 'hex' ) }`;
    } finally {
      await file.close();
    }
  }

  private async scanDirectory (
    root: MediaRoot, directory: string, existingByPath: Map< string, ExistingMedia >,
    files: ScannedFile[], result: ScanResult, progress: { count: number }, signal: AbortSignal
  ) : Promise< void > {
    signal.throwIfAborted();
    let entries;

    try { entries = await readdir( directory, { withFileTypes: true } ) }
    catch ( err ) {
      if ( signal.aborted ) throw err;

      result.errors++;
      console.error( `Failed to scan directory ${ directory }:`, err );
      return;
    }

    for ( const entry of entries ) {
      signal.throwIfAborted();
      const path = join( directory, entry.name );

      if ( entry.isSymbolicLink() ) { result.ignored++; continue }
      if ( entry.isDirectory() ) {
        await this.scanDirectory( root, path, existingByPath, files, result, progress, signal );
        continue;
      }

      if ( ! entry.isFile() ) { result.ignored++; continue }

      const fileName = entry.name;
      const extension = extname( fileName ).toLowerCase();
      const media = extensions[ extension ];

      if ( ! media ) { result.ignored++; continue }

      try {
        signal.throwIfAborted();
        const file = await stat( path );
        signal.throwIfAborted();

        const rootRelativePath = relative( root.path, path ).split( sep ).join( '/' );
        const relativePath = `${ root.id }/${ rootRelativePath }`;
        const previous = existingByPath.get( relativePath );

        const hash = previous?.content_hash?.startsWith( `${ hashVersion }:` ) &&
          previous.file_size === file.size && previous.file_mtime_ms === file.mtimeMs
          ? previous.content_hash : await this.hashFile( path, file.size, file.mtimeMs, signal );

        signal.throwIfAborted();

        files.push( {
          root, path, relativePath, rootRelativePath, fileName,
          type: media.type, mime: media.mime, title: basename( fileName, extension ),
          size: file.size, mtimeMs: file.mtimeMs, hash
        } );

        result.discovered++;
      } catch ( err ) {
        if ( signal.aborted ) throw err;

        result.errors++;
        console.error( `Failed to register media file ${ path }:`, err );
      }

      if ( ++progress.count % 100 === 0 ) {
        signal.throwIfAborted();
        await new Promise( resolve => setImmediate( resolve ) );
      }
    }
  }

  public async scan ( roots: MediaRoot[], signal: AbortSignal ) : Promise< ScanResult > {
    signal.throwIfAborted();

    const result: ScanResult = { discovered: 0, ignored: 0, errors: 0 };
    const files: ScannedFile[] = [], rootIds = roots.map( root => root.id );

    const existing = db.prepare( `
      SELECT id, relative_path, media_root_id, root_relative_path,
        file_name, media_type, mime_type, title, file_size,
        file_mtime_ms, content_hash, metadata_json, is_available
      FROM media
    ` ).all() as unknown as ExistingMedia[];

    signal.throwIfAborted();

    const existingByPath = new Map( existing.map( media => [ media.relative_path, media ] ) );
    const progress = { count: 0 };

    for ( const root of roots ) {
      signal.throwIfAborted();
      await this.scanDirectory( root, root.path, existingByPath, files, result, progress, signal );
    }

    signal.throwIfAborted();

    if ( result.errors > 0 ) return result;

    const scannedPaths = new Set( files.map( file => file.relativePath ) );
    const hashCounts = new Map< string, number >();
    const existingHashCounts = new Map< string, number >();

    for ( const file of files ) {
      signal.throwIfAborted();
      hashCounts.set( file.hash, ( hashCounts.get( file.hash ) || 0 ) + 1 );
    }

    for ( const media of existing ) {
      signal.throwIfAborted();

      if ( media.content_hash ) existingHashCounts.set(
        media.content_hash, ( existingHashCounts.get( media.content_hash ) || 0 ) + 1
      );
    }

    const matchedIds = new Set< number >();
    const matchedFiles = new Map< ScannedFile, ExistingMedia >();

    for ( const file of files ) {
      signal.throwIfAborted();

      const previous = existingByPath.get( file.relativePath );

      if ( previous ) {
        matchedIds.add( previous.id );
        matchedFiles.set( file, previous );
      }
    }

    for ( const file of files ) {
      signal.throwIfAborted();

      if ( matchedFiles.has( file ) ) continue;
      if ( hashCounts.get( file.hash ) !== 1 ) continue;
      if ( existingHashCounts.get( file.hash ) !== 1 ) continue;

      const previous = existing.find( media =>
        media.content_hash === file.hash && rootIds.includes( media.media_root_id as number ) &&
        ! scannedPaths.has( media.relative_path ) && ! matchedIds.has( media.id )
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

    signal.throwIfAborted();
    db.exec( 'BEGIN IMMEDIATE' );

    try {
      for ( const media of existing ) {
        signal.throwIfAborted();

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
        signal.throwIfAborted();

        const previous = matchedFiles.get( file );
        const metadataChanged = ! previous || previous.file_size !== file.size ||
          previous.file_mtime_ms !== file.mtimeMs || previous.content_hash !== file.hash ||
          previous.media_type !== file.type || ! previous.metadata_json ||
          previous.metadata_json === '{}';

        let mediaId: number;

        if ( previous ) {
          updateMedia.run(
            file.relativePath, file.root.id, file.rootRelativePath, file.fileName,
            file.type, file.mime, file.title, file.size, file.mtimeMs, file.hash, previous.id
          );

          mediaId = previous.id;
        } else {
          const inserted = insertMedia.run(
            file.relativePath, file.root.id, file.rootRelativePath, file.fileName,
            file.type, file.mime, file.title, file.size, file.mtimeMs, file.hash
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

      for ( const root of roots ) { signal.throwIfAborted(), updateRoot.run( root.id ) }
      signal.throwIfAborted();
      db.exec( 'COMMIT' );
    } catch ( err ) {
      db.exec( 'ROLLBACK' );
      throw err;
    }

    return result;
  }
}


export const mediaScanner = new MediaScanner();
