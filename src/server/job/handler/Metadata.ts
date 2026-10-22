import { MediaRoots } from '@/src/server/media/Roots';
import { Media } from '@/src/server/media/Media';
import type { ExtractedMetadata, JobContext, JobHandler, ProbeData } from '@/src/shared/types/job';
import type { MediaType, MediaUpdate } from '@/src/shared/types/media';
import { execFile } from 'node:child_process';
import { open, stat } from 'node:fs/promises';
import { extname } from 'node:path';
import { promisify } from 'node:util';
import { execFileAsync } from '@/src/server/utils';


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
}
