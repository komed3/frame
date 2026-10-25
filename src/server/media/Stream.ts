import { Media } from '@/src/server/media/Media';
import { MediaRoots } from '@/src/server/media/Roots';
import type { MediaRecord } from '@/src/shared/types/media';
import type { NextFunction, Request, Response } from 'express';
import type { ReadStream } from 'node:fs';
import { open } from 'node:fs/promises';
import type { Stats } from 'node:fs';
import type { FileHandle } from 'node:fs/promises';
import type { ByteRange } from '@/src/shared/types/stream';


const CHUNK_SIZE = 1024 * 1024;
const STREAM_BUFFER_SIZE = 64 * 1024;


export class Stream {
  private static defaultRange ( size: number ) : ByteRange {
    return { start: 0, end: Math.min( size - 1, CHUNK_SIZE - 1 ) };
  }

  private static parseRange ( value: string, size: number ) : ByteRange | null {
    const match = /^bytes=(\d*)-(\d*)$/i.exec( value.trim() );
    if ( ! match || size <= 0 ) return null;

    const [ , startValue, endValue ] = match;
    if ( startValue === '' && endValue === '' ) return null;

    let start: number, end: number;

    if ( startValue === '' ) {
      const suffix = Number( endValue );
      if ( ! Number.isSafeInteger( suffix ) || suffix <= 0 ) return null;

      start = Math.max( 0, size - Math.min( suffix, CHUNK_SIZE ) );
      end = size - 1;
    } else {
      start = Number( startValue );
      end = endValue === '' ? size - 1 : Number( endValue );

      if ( ! Number.isSafeInteger( start ) || ! Number.isSafeInteger( end ) ||
        start < 0 || start >= size || end < start ) return null;

      end = Math.min( end, size - 1, start + CHUNK_SIZE - 1 );
    }

    return { start, end };
  }

  private static etag ( stats: Stats ) : string {
    return `"${ stats.size.toString( 16 ) }-${ Math.trunc( stats.mtimeMs ).toString( 16 ) }-${ stats.ino.toString( 16 ) }"`;
  }

  private static ifRangeMatches ( value: string | undefined, etag: string, stats: Stats ) : boolean {
    if ( ! value ) return true;
    if ( value.startsWith( '"' ) ) return value === etag;

    const date = Date.parse( value );
    return Number.isFinite( date ) && date >= Math.floor( stats.mtimeMs / 1000 ) * 1000;
  }

  private static sendError ( res: Response, status: number, message: string ) : void {
    if ( res.headersSent ) { res.destroy(); return }
    res.status( status ).json( { error: message } );
  }

  private static resolveMedia ( id: string, res: Response ) : MediaRecord | null {
    let media: MediaRecord | null;

    try { media = Media.get( id ) }
    catch ( err ) {
      Stream.sendError( res, 400, err instanceof Error ? err.message : 'Invalid media ID' );
      return null;
    }

    if ( ! media ) {
      Stream.sendError( res, 404, 'Media not found' );
      return null;
    }

    if ( ! media.available ) {
      Stream.sendError( res, 404, 'Media is unavailable' );
      return null;
    }

    if ( media.type !== 'video' && media.type !== 'audio' ) {
      Stream.sendError( res, 415, 'Media type cannot be streamed' );
      return null;
    }

    return media;
  }

  private static async openMedia ( media: MediaRecord, res: Response ) : Promise< FileHandle | null > {
    let path: string;

    try { path = MediaRoots.resolve( media.rootId, media.path ) }
    catch ( err ) {
      const message = err instanceof Error ? err.message : '';
      const status = /does not exist|disabled|ENOENT|ENOTDIR/i.test( message ) ? 404
        : /invalid|traversal|outside/i.test( message ) ? 400 : 500;

      Stream.sendError( res, status, status < 500 ? message : 'Unable to access media' );
      return null;
    }

    try {
      const file = await open( path, 'r' );
      const stats = await file.stat();

      if ( ! stats.isFile() ) {
        await file.close();

        Stream.sendError( res, 404, 'Media file not found' );
        return null;
      }

      return file;
    } catch ( err ) {
      const code = ( err as NodeJS.ErrnoException ).code;

      if ( code === 'ENOENT' || code === 'ENOTDIR' ) {
        Stream.sendError( res, 404, 'Media file not found' );
        return null;
      }

      if ( code === 'EACCES' || code === 'EPERM' ) {
        Stream.sendError( res, 403, 'Media file cannot be accessed' );
        return null;
      }

      throw err;
    }
  }
}
