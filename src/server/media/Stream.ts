import { Media } from '@/src/server/media/Media';
import { MediaRoots } from '@/src/server/media/Roots';
import type { MediaRecord } from '@/src/shared/types/media';
import type { ByteRange, StreamResult } from '@/src/shared/types/stream';
import { realpathSync, type ReadStream, type Stats } from 'node:fs';
import type { FileHandle } from 'node:fs/promises';
import { open } from 'node:fs/promises';


const CHUNK_SIZE = 1024 * 1024;
const STREAM_BUFFER_SIZE = 64 * 1024;


export class StreamError extends Error {
  public constructor (
    message: string,
    public readonly status: number,
    public readonly headers: Record< string, string > = {}
  ) {
    super( message );
    this.name = 'StreamError';
  }
}


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

    value = value.trim();
    if ( value.startsWith( '"' ) || value.startsWith( 'W/' ) ) return value === etag;

    const date = Date.parse( value );
    return Number.isFinite( date ) && date >= Math.floor( stats.mtimeMs / 1000 ) * 1000;
  }

  private static resolveMedia ( id: string ) : MediaRecord {
    let media: MediaRecord | null;

    try { media = Media.get( id ) }
    catch ( err ) { throw new StreamError( err instanceof Error ? err.message : 'Invalid media ID', 400 ) }

    if ( ! media ) throw new StreamError( 'Media not found', 404 );
    if ( ! media.available ) throw new StreamError( 'Media is unavailable', 404 );

    if ( media.type !== 'video' && media.type !== 'audio' )
      throw new StreamError( 'Media type cannot be streamed', 415 );

    return media;
  }

  private static async openMedia ( media: MediaRecord ) : Promise< [ FileHandle, Stats ] > {
    let path: string;

    try { path = MediaRoots.resolve( media.rootId, media.path ) }
    catch ( err ) {
      const message = err instanceof Error ? err.message : '';
      const status = /does not exist|disabled|ENOENT|ENOTDIR/i.test( message ) ? 404
        : /invalid|traversal|outside/i.test( message ) ? 400 : 500;

      throw new StreamError( status < 500 ? message : 'Unable to access media', status );
    }

    let file: FileHandle;

    try { file = await open( path, 'r' ) }
    catch ( err ) {
      const code = ( err as NodeJS.ErrnoException ).code;

      if ( code === 'ENOENT' || code === 'ENOTDIR' ) throw new StreamError( 'Media file not found', 404 );
      if ( code === 'EACCES' || code === 'EPERM' ) throw new StreamError( 'Media file cannot be accessed', 403 );

      throw err;
    }

    try {
      const stats = await file.stat();
      if ( ! stats.isFile() ) throw new StreamError( 'Media file not found', 404 );

      const actualPath = realpathSync( `/proc/self/fd/${ file.fd }` );
      if ( actualPath !== path ) throw new StreamError( 'Media path changed while opening', 403 );

      return [ file, stats ];
    } catch ( err ) {
      try { await file.close() }
      catch { /** Preserve the original error */ }

      if ( err instanceof StreamError ) throw err;
      throw new StreamError( 'Unable to verify media file', 500 );
    }
  }

  private static contentType ( media: MediaRecord ) : string {
    if ( media.mimeType && /^[a-zA-Z0-9!#$&^_.+-]+\/[a-zA-Z0-9!#$&^_.+-]+$/.test( media.mimeType ) ) return media.mimeType;
    return 'application/octet-stream';
  }

  public static async open ( id: string, rangeHeader?: string, ifRangeHeader?: string, method: 'GET' | 'HEAD' = 'GET' ) : Promise< StreamResult > {
    const media = Stream.resolveMedia( id ), [ file, stats ] = await Stream.openMedia( media );
    let body: ReadStream | null = null;

    try {
      const size = stats.size, etag = Stream.etag( stats );
      const headers: Record< string, string > = {
        'Accept-Ranges': 'bytes', 'Cache-Control': 'private, no-cache', 'Content-Type': Stream.contentType( media ),
        'ETag': etag, 'Last-Modified': stats.mtime.toUTCString(), 'X-Content-Type-Options': 'nosniff'
      };

      if ( size <= 0 ) throw new StreamError( 'Media file is empty', 416, { 'Content-Range': 'bytes */0' } );

      const rangeAllowed = Stream.ifRangeMatches( ifRangeHeader, etag, stats );
      const range = ! rangeHeader || ! rangeAllowed ? Stream.defaultRange( size ) : Stream.parseRange( rangeHeader, size );

      if ( ! range ) throw new StreamError( 'Requested byte range is not satisfiable', 416, {
        'Content-Range': `bytes */${ size }`
      } );

      const length = range.end - range.start + 1;

      headers[ 'Content-Length' ] = String( length );
      headers[ 'Content-Range' ] = `bytes ${ range.start }-${ range.end }/${ size }`;

      if ( method === 'HEAD' ) {
        await file.close();
        return { status: 206, headers, body: null };
      }

      body = file.createReadStream( {
        start: range.start, end: range.end, highWaterMark: STREAM_BUFFER_SIZE,
        autoClose: true
      } );

      return { status: 206, headers, body };
    } catch ( err ) {
      if ( ! body ) {
        try { await file.close() }
        catch { /** Preserve the original error */ }
      }

      throw err;
    }
  }
}
