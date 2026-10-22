import { assertMediaUnchange } from '@/src/server/job/handler/utils';
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

  public async execute ( { job, signal }: JobContext ) : Promise< void > {
    if ( job.kind !== 'text' || job.mediaId === null || job.rootId !== null ) throw new Error( 'Invalid text job' );
    signal.throwIfAborted();

    const media = Media.get( job.mediaId );
    if ( ! media || ! media.available ) return;
    if ( media.type !== 'text' ) return;

    const root = MediaRoots.list().find( root => root.id === media.rootId );
    if ( ! root ) throw new Error( `Media root ${ media.rootId } does not exist` );
    if ( ! root.enabled ) return console.warn( `[Text] Skipping disabled root ${ root.id }.` );

    const path = MediaRoots.resolve( media.rootId, media.path );
    const info = await stat( path );

    signal.throwIfAborted();
    assertMediaUnchange( path, media, info );

    const file = await open( path );

    try {
      const buffer = Buffer.alloc( maxBytes );
      const { bytesRead } = await file.read( buffer, 0, buffer.length, 0 );

      signal.throwIfAborted();

      const excerpt = this.decode( buffer.subarray( 0, bytesRead ) );
      const finalStat = await file.stat();
      signal.throwIfAborted();

      if ( finalStat.size !== info.size || finalStat.mtimeMs !== info.mtimeMs )
        throw new Error( `Media changed while extracting text: ${ path }` );

      MediaMetadata.set( media.id, 'textExcerpt', excerpt, 'scan' );

      const bytes = Buffer.byteLength( excerpt, 'utf8' );
      console.info( `[Text] Media ${ media.id } (${ media.path }) excerpt extracted: ${ bytes } byte(s).` );
    } finally {
      await file.close();
    }
  }
}
