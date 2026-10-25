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
}
