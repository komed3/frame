import { Media } from '@/src/server/media/Media';
import { MediaRoots } from '@/src/server/media/Roots';
import { execFileAsync } from '@/src/server/utils';
import type { ExtractedMetadata, JobContext, JobHandler, ProbeData } from '@/src/shared/types/job';
import type { MediaType } from '@/src/shared/types/media';
import { open, stat } from 'node:fs/promises';
import { extname } from 'node:path';


export class MetadataJob implements JobHandler {
  private number ( value: string | number | undefined ) : number | null {
    if ( value === undefined || value === '' ) return null;

    const parsed = Number( value );
    return Number.isFinite( parsed ) ? parsed : null;
  }

  private positive ( value: string | number | undefined ) : number | null {
    const parsed = this.number( value );
    return parsed !== null && parsed > 0 ? parsed : null;
  }

  private parseRate ( value?: string ) : number | null {
    if ( ! value ) return null;

    const [ numerator, denominator ] = value.split( '/' ).map( Number );
    if ( ! denominator || ! Number.isFinite( numerator ) || ! Number.isFinite( denominator ) ) return null;

    const rate = numerator / denominator;
    return Number.isFinite( rate ) && rate > 0 ? rate : null;
  }

  private parseDate ( tags: Record< string, string >, ...keys: string[] ) : string | null {
    for ( const key of keys ) {
      const value = Object.entries( tags ).find( ( [ name ] ) => name.toLowerCase() === key )?.[ 1 ];
      if ( ! value ) continue;

      const compact = value.match( /^(\d{4})(\d{2})(\d{2})$/ );
      if ( compact ) return `${ compact[ 1 ] }-${ compact[ 2 ] }-${ compact[ 3 ] }`;

      const match = value.match( /^\d{4}(?:-\d{2}(?:-\d{2})?)?/ );
      if ( match ) return match[ 0 ];
    }

    return null;
  }

  private async probe ( path: string, type: MediaType, signal: AbortSignal ) : Promise< ExtractedMetadata > {
    signal.throwIfAborted();

    const { stdout } = await execFileAsync( 'ffprobe',
      [ '-v', 'error', '-show_format', '-show_streams', '-of', 'json', path ],
      { encoding: 'utf8', timeout: 60_000, maxBuffer: 8 * 1024 * 1024, signal }
    );

    signal.throwIfAborted();

    const probe = JSON.parse( stdout ) as ProbeData;
    const streams = probe.streams ?? [], format = probe.format ?? {};
    const video = streams.find( s => s.codec_type === 'video' && ! s.disposition?.attached_pic ) ??
      streams.find( s => s.codec_type === 'video' );
    const audio = streams.find( s => s.codec_type === 'audio' );
    const primary = type === 'audio' ? audio : video ?? audio;
    const tags = { ...format.tags, ...primary?.tags };
    const duration = this.positive( format.duration );

    return {
      durationMs: type === 'video' || type === 'audio'
        ? duration === null ? null : Math.round( duration * 1000 )
        : null,
      width: this.positive( video?.width ),
      height: this.positive( video?.height ),
      fps: type === 'video'
        ? this.parseRate( video?.avg_frame_rate ) ?? this.parseRate( video?.r_frame_rate )
        : null,
      bitrate: this.positive( format.bit_rate ) ?? this.positive( primary?.bit_rate ),
      container: ( format.format_name?.split( ',' )[ 0 ] ?? extname( path ).slice( 1 ) ) || null,
      videoCodec: video?.codec_name ?? null,
      audioCodec: audio?.codec_name ?? null,
      sampleRate: this.positive( audio?.sample_rate ),
      channels: this.positive( audio?.channels ),
      encoding: null,
      language: tags.language ?? null,
      releasedAt: this.parseDate( tags, 'date', 'year', 'release_date' ),
      recordedAt: this.parseDate( tags, 'creation_time', 'recorded_date', 'date_recorded' ),
      data: {
        format: format.format_name ?? null,
        tags,
        streams: streams.map( stream => ( {
          type: stream.codec_type ?? null,
          codec: stream.codec_name ?? null,
          width: stream.width ?? null,
          height: stream.height ?? null,
          attachedPicture: Boolean( stream.disposition?.attached_pic ),
          tags: stream.tags ?? {}
        } ) )
      }
    };
  }

  private async probeText ( path: string, size: number, signal: AbortSignal ) : Promise< ExtractedMetadata > {
    signal.throwIfAborted();
    const file = await open( path );

    try {
      const buffer = Buffer.alloc( 4096 );
      const { bytesRead } = await file.read( buffer, 0, buffer.length, 0 );
      const sample = buffer.subarray( 0, bytesRead );
      let encoding = 'UTF-8';

      if ( sample[ 0 ] === 0xef && sample[ 1 ] === 0xbb && sample[ 2 ] === 0xbf ) encoding = 'UTF-8 BOM';
      else if ( sample[ 0 ] === 0xff && sample[ 1 ] === 0xfe ) encoding = 'UTF-16 LE';
      else if ( sample[ 0 ] === 0xfe && sample[ 1 ] === 0xff ) encoding = 'UTF-16 BE';
      else {
        try { new TextDecoder( 'utf-8', { fatal: true } ).decode( sample ) }
        catch { encoding = 'Windows-1252' }
      }

      signal.throwIfAborted();

      return {
        durationMs: null, width: null, height: null, fps: null, bitrate: null,
        container: 'text', videoCodec: null, audioCodec: null,
        sampleRate: null, channels: null, encoding, language: null,
        releasedAt: null, recordedAt: null,
        data: { mediaType: 'text', textEncoding: encoding, fileSize: size }
      };
    } finally {
      await file.close();
    }
  }

  public async execute ( { job, signal }: JobContext ) : Promise< void > {
    if ( job.kind !== 'metadata' || job.mediaId === null || job.rootId !== null )
      throw new Error( 'Invalid metadata job' );

    signal.throwIfAborted();

    const media = Media.get( job.mediaId );
    if ( ! media || ! media.available ) return;

    const root = MediaRoots.list().find( root => root.id === media.rootId );
    if ( ! root ) throw new Error( `Media root ${ media.rootId } does not exist` );
    if ( ! root.enabled ) return console.warn( `[Metadata] Skipping disabled root ${ root.id }.` );

    const path = MediaRoots.resolve( media.rootId, media.path );
    const info = await stat( path );

    signal.throwIfAborted();

    if ( info.size !== media.sizeBytes || ( media.modifiedAt !== null &&
      info.mtimeMs !== new Date( media.modifiedAt ).getTime() ) )
      throw new Error( `Media changed since scan: ${ path }` );

    const metadata = media.type === 'text'
      ? await this.probeText( path, info.size, signal )
      : await this.probe( path, media.type, signal );

    signal.throwIfAborted();
    Media.update( media.id, metadata );

    console.info( `[Metadata] Media ${ media.id } (${ media.path }) processed.` );
  }
}
