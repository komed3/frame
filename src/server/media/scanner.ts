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
  private async hashFile ( path: string, size: number, mtimeMs: number ) : Promise< string > {
    const file = await open( path );

    try {
      const initialStat = await file.stat();

      if ( initialStat.size !== size || initialStat.mtimeMs !== mtimeMs )
        throw new Error( `File changed before hashing: ${ path }` );

      const hash = createHash( 'sha256' );
      hash.update( `${ hashVersion }\0${ size }\0` );

      const offsets = size <= sampleSize ? [ 0 ] : [
        0, Math.floor( ( size - sampleSize ) / 2 ), size - sampleSize
      ];

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
}
