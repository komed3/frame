import { as, conn, db } from '@/src/server/core/Database';
import { JobQueue } from '@/src/server/job/Queue';
import { Media } from '@/src/server/media/Media';
import { MediaDirectories } from '@/src/server/media/Directories';
import { MediaRoots } from '@/src/server/media/Roots';
import type { ExistingMedia, JobContext, JobHandler, JobKind, ScannedFile, ScanStats } from '@/src/shared/types/job';
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
}
