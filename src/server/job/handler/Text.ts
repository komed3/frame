import { Media } from '@/src/server/media/Media';
import { MediaMetadata } from '@/src/server/media/Metadata';
import { MediaRoots } from '@/src/server/media/Roots';
import type { JobContext, JobHandler } from '@/src/shared/types/job';
import { open, stat } from 'node:fs/promises';


const maxBytes = 16 * 1024;


export class TextJob implements JobHandler {
  private decode ( buffer: Buffer ) : string {
    let encoding = 'utf-8', offset = 0;

    if ( buffer[ 0 ] === 0xef && buffer[ 1 ] === 0xbb && buffer[ 2 ] === 0xbf ) offset = 3;
    else if ( buffer[ 0 ] === 0xff && buffer[ 1 ] === 0xfe ) encoding = 'utf-16le', offset = 2;
    else if ( buffer[ 0 ] === 0xfe && buffer[ 1 ] === 0xff ) encoding = 'utf-16be', offset = 2;
    else {
      try { new TextDecoder( 'utf-8', { fatal: true } ).decode( buffer, { stream: true } ) }
      catch { encoding = 'windows-1252' }
    }

    const sample = buffer.subarray( offset );
    const bytes = encoding.startsWith( 'utf-16' ) ? sample.subarray( 0, sample.length - sample.length % 2 ) : sample;
    return new TextDecoder( encoding ).decode( bytes ).replace( /^\uFEFF/, '' ).replace( /\r\n?/g, '\n' ).trim();
  }
}
