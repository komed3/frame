import { as, conn, db } from '@/src/server/core/Database';
import { JobQueue } from '@/src/server/job/Queue';
import { MediaDirectories } from '@/src/server/media/Directories';
import { Media } from '@/src/server/media/Media';
import { MediaRoots } from '@/src/server/media/Roots';
import type { ExistingMedia, JobContext, JobHandler, ScannedFile, ScanStats } from '@/src/shared/types/job';
import type { MediaType } from '@/src/shared/types/media';
import type { MediaRoot } from '@/src/shared/types/roots';
import { createHash } from 'node:crypto';
import { open, readdir, stat } from 'node:fs/promises';
import { basename, extname, join, relative, sep } from 'node:path';


const hashVersion = 'partial-sha256-v1', sampleSize = 64 * 1024;
const extensions: Record< string, { type: MediaType, mimeType: string } > = {
  '.mp4': { type: 'video', mimeType: 'video/mp4' },
  '.m4v': { type: 'video', mimeType: 'video/mp4' },
  '.mkv': { type: 'video', mimeType: 'video/x-matroska' },
  '.mov': { type: 'video', mimeType: 'video/quicktime' },
  '.avi': { type: 'video', mimeType: 'video/x-msvideo' },
  '.webm': { type: 'video', mimeType: 'video/webm' },
  '.mpg': { type: 'video', mimeType: 'video/mpeg' },
  '.mpeg': { type: 'video', mimeType: 'video/mpeg' },
  '.mts': { type: 'video', mimeType: 'video/mp2t' },
  '.m2ts': { type: 'video', mimeType: 'video/mp2t' },
  '.ts': { type: 'video', mimeType: 'video/mp2t' },
  '.wmv': { type: 'video', mimeType: 'video/x-ms-wmv' },
  '.flv': { type: 'video', mimeType: 'video/x-flv' },
  '.ogv': { type: 'video', mimeType: 'video/ogg' },
  '.mp3': { type: 'audio', mimeType: 'audio/mpeg' },
  '.m4a': { type: 'audio', mimeType: 'audio/mp4' },
  '.aac': { type: 'audio', mimeType: 'audio/aac' },
  '.flac': { type: 'audio', mimeType: 'audio/flac' },
  '.ogg': { type: 'audio', mimeType: 'audio/ogg' },
  '.opus': { type: 'audio', mimeType: 'audio/opus' },
  '.wav': { type: 'audio', mimeType: 'audio/wav' },
  '.wma': { type: 'audio', mimeType: 'audio/x-ms-wma' },
  '.aiff': { type: 'audio', mimeType: 'audio/aiff' },
  '.aif': { type: 'audio', mimeType: 'audio/aiff' },
  '.ape': { type: 'audio', mimeType: 'audio/ape' },
  '.mid': { type: 'audio', mimeType: 'audio/midi' },
  '.midi': { type: 'audio', mimeType: 'audio/midi' },
  '.jpg': { type: 'image', mimeType: 'image/jpeg' },
  '.jpeg': { type: 'image', mimeType: 'image/jpeg' },
  '.png': { type: 'image', mimeType: 'image/png' },
  '.gif': { type: 'image', mimeType: 'image/gif' },
  '.webp': { type: 'image', mimeType: 'image/webp' },
  '.avif': { type: 'image', mimeType: 'image/avif' },
  '.bmp': { type: 'image', mimeType: 'image/bmp' },
  '.tif': { type: 'image', mimeType: 'image/tiff' },
  '.tiff': { type: 'image', mimeType: 'image/tiff' },
  '.svg': { type: 'image', mimeType: 'image/svg+xml' },
  '.heic': { type: 'image', mimeType: 'image/heic' },
  '.heif': { type: 'image', mimeType: 'image/heif' },
  '.txt': { type: 'text', mimeType: 'text/plain' }
};


export class ScanJob implements JobHandler {
  private async hashFile ( path: string, size: number, mtimeMs: number, signal: AbortSignal ) : Promise< string > {
    signal.throwIfAborted();
    const file = await open( path );

    try {
      const initialStat = await file.stat();
      signal.throwIfAborted();

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
    root: MediaRoot, directory: string, existingByPath: Map< string, ExistingMedia >, files: ScannedFile[],
    directories: string[], stats: ScanStats, progress: { count: number }, signal: AbortSignal
  ) : Promise< void > {
    signal.throwIfAborted();
    let entries;

    try { entries = await readdir( directory, { withFileTypes: true } ) }
    catch ( err ) {
      if ( signal.aborted ) throw err;

      stats.errors++;
      console.error( `[Scan] Could not read directory ${ directory }:`, err );
      return;
    }

    for ( const entry of entries ) {
      signal.throwIfAborted();

      const absolutePath = join( directory, entry.name );

      if ( entry.isSymbolicLink() ) { stats.ignored++; continue }

      if ( entry.isDirectory() ) {
        directories.push( relative( root.path, absolutePath ).split( sep ).join( '/' ) );
        await this.scanDirectory( root, absolutePath, existingByPath, files, directories, stats, progress, signal );
        continue;
      }

      if ( ! entry.isFile() ) { stats.ignored++; continue }

      const extension = extname( entry.name ).toLowerCase();
      const media = extensions[ extension ];

      if ( ! media ) { stats.ignored++; continue }

      try {
        const fileStat = await stat( absolutePath );
        signal.throwIfAborted();

        const path = relative( root.path, absolutePath ).split( sep ).join( '/' );
        const modifiedAt = fileStat.mtime.toISOString();
        const previous = existingByPath.get( path );

        const fingerprint = previous?.fingerprint?.startsWith( `${ hashVersion }:` ) &&
          previous.sizeBytes === fileStat.size && previous.modifiedAt === modifiedAt
          ? previous.fingerprint
          : await this.hashFile( absolutePath, fileStat.size, fileStat.mtimeMs, signal );

        signal.throwIfAborted();

        files.push( {
          absolutePath, path, fileName: entry.name, type: media.type, mimeType: media.mimeType,
          sizeBytes: fileStat.size, mtimeMs: fileStat.mtimeMs, modifiedAt, fingerprint
        } );

        stats.discovered++;
      } catch ( err ) {
        if ( signal.aborted ) throw err;

        stats.errors++;
        console.error( `[Scan] Could not inspect file ${ absolutePath }:`, err );
      }

      if ( ++progress.count % 100 === 0 ) {
        signal.throwIfAborted();
        await new Promise< void >( resolve => setImmediate( resolve ) );
      }
    }
  }

  private enqueueMediaJobs ( mediaId: number, type: MediaType ) : void {
    JobQueue.enqueue( { kind: 'metadata', mediaId } );

    if ( type === 'video' || type === 'audio' ) {
      JobQueue.enqueue( { kind: 'tracks', mediaId } );
      JobQueue.enqueue( { kind: 'wave', mediaId } );
    }

    if ( type === 'video' || type === 'image' || type === 'audio' )
      JobQueue.enqueue( { kind: 'preview', mediaId } );

    if ( type === 'video' ) JobQueue.enqueue( { kind: 'frames', mediaId } );
    if ( type === 'text' ) JobQueue.enqueue( { kind: 'text', mediaId } );
  }

  private async scan ( root: MediaRoot, signal: AbortSignal ) : Promise< ScanStats > {
    const existing = as< ExistingMedia[] >( conn().prepare( `
      SELECT
        id, path, file_name AS fileName, type, mime_type AS mimeType,
        size_bytes AS sizeBytes, modified_at AS modifiedAt, fingerprint,
        available, title
      FROM media
      WHERE root_id = ?
    ` ).all( root.id ) );

    signal.throwIfAborted();

    const existingByPath = new Map( existing.map( media => [ media.path, media ] ) );
    const files: ScannedFile[] = [], directories: string[] = [];
    const stats: ScanStats = { discovered: 0, ignored: 0, errors: 0 };

    await this.scanDirectory( root, root.path, existingByPath, files, directories, stats, { count: 0 }, signal );
    signal.throwIfAborted();

    if ( stats.errors > 0 ) throw new Error(
      `Scan of root ${ root.id } found ${ stats.errors } error(s); database was not updated`
    );

    const scannedPaths = new Set( files.map( file => file.path ) );
    const hashCounts = new Map< string, number >();
    const existingHashCounts = new Map< string, number >();
    const existingByFingerprint = new Map< string, ExistingMedia[] >();

    for ( const file of files ) hashCounts.set( file.fingerprint, ( hashCounts.get( file.fingerprint ) ?? 0 ) + 1 );

    for ( const media of existing ) {
      if ( ! media.fingerprint?.startsWith( `${ hashVersion }:` ) ) continue;

      existingHashCounts.set( media.fingerprint, ( existingHashCounts.get( media.fingerprint ) ?? 0 ) + 1 );
      const matches = existingByFingerprint.get( media.fingerprint ) ?? [];
      matches.push( media );
      existingByFingerprint.set( media.fingerprint, matches );
    }

    const matchedIds = new Set< number >();
    const matchedFiles = new Map< ScannedFile, ExistingMedia >();

    for ( const file of files ) {
      const previous = existingByPath.get( file.path );

      if ( previous ) {
        matchedIds.add( previous.id );
        matchedFiles.set( file, previous );
      }
    }

    for ( const file of files ) {
      signal.throwIfAborted();

      if ( matchedFiles.has( file ) ) continue;
      if ( hashCounts.get( file.fingerprint ) !== 1 ) continue;
      if ( existingHashCounts.get( file.fingerprint ) !== 1 ) continue;

      const previous = existingByFingerprint.get( file.fingerprint )?.find( media =>
        ! scannedPaths.has( media.path ) && ! matchedIds.has( media.id )
      );

      if ( ! previous ) continue;

      matchedIds.add( previous.id );
      matchedFiles.set( file, previous );
    }

    signal.throwIfAborted();

    const generation = MediaDirectories.beginScan( root.id );
    const directoryIds = new Map< string, number >();

    for ( const path of directories ) {
      signal.throwIfAborted();
      directoryIds.set( path, MediaDirectories.register( root.id, path, generation ) );
    }

    signal.throwIfAborted();

    db.transaction( tx => {
      const updatePath = tx.prepare( 'UPDATE media SET path = ? WHERE id = ?' );
      const markUnavailable = tx.prepare( `
        UPDATE media SET
          available = 0,
          updated_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )
        WHERE id = ? AND available = 1
      ` );

      for ( const media of existing ) {
        signal.throwIfAborted();

        if ( ! scannedPaths.has( media.path ) && ! matchedIds.has( media.id ) )
          markUnavailable.run( media.id );
      }

      for ( const file of files ) {
        signal.throwIfAborted();

        const previous = matchedFiles.get( file );
        if ( previous && previous.path !== file.path ) updatePath.run( file.path, previous.id );

        const separator = file.path.lastIndexOf( '/' );
        const directoryPath = separator < 0 ? null : file.path.slice( 0, separator );
        const directoryId = directoryPath === null ? null : directoryIds.get( directoryPath ) ?? null;

        const mediaId = Media.registerFile( {
          rootId: root.id, path: file.path, fileName: file.fileName, type: file.type,
          mimeType: file.mimeType, sizeBytes: file.sizeBytes, modifiedAt: file.modifiedAt
        }, directoryId );

        const metadataChanged = ! previous || previous.sizeBytes !== file.sizeBytes ||
          previous.modifiedAt !== file.modifiedAt || previous.fingerprint !== file.fingerprint ||
          previous.type !== file.type || previous.mimeType !== file.mimeType ||
          previous.available !== 1;

        Media.update( mediaId, { fingerprint: file.fingerprint, ...(
          ! previous?.title ? { title: basename( file.fileName, extname( file.fileName ) ) } : {}
        ) } );

        if ( metadataChanged ) this.enqueueMediaJobs( mediaId, file.type );
      }
    } );

    signal.throwIfAborted();
    MediaDirectories.finishScan( root.id, generation );

    return stats;
  }

  public async execute ( { job, signal }: JobContext ) : Promise< void > {
    if ( job.kind !== 'scan' || job.rootId === null || job.mediaId !== null ) throw new Error( 'Invalid scan job' );

    signal.throwIfAborted();
    const root = MediaRoots.list().find( root => root.id === job.rootId );

    if ( ! root ) throw new Error( `Media root ${ job.rootId } does not exist` );
    if ( ! root.enabled ) return console.warn( `[Scan] Skipping disabled root ${ root.id }.` );

    const result = await this.scan( root, signal );
    signal.throwIfAborted();

    console.info(
      `[Scan] Root ${ root.id } finished: ${ result.discovered } files found, ` +
      `${ result.ignored } ignored.`
    );
  }
}
