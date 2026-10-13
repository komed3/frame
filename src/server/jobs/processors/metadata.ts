import { db } from '@/src/server/db';
import { execFileAsync } from '@/src/server/utils';
import type { MediaJob, MediaMetadata, MediaSourceRecord } from '@/src/shared/types';
import { open, stat } from 'node:fs/promises';
import { extname, relative, resolve, sep } from 'node:path';


interface ProbeStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  avg_frame_rate?: string;
  r_frame_rate?: string;
  bit_rate?: string;
  sample_rate?: string;
  channels?: number;
  disposition?: { attached_pic?: number };
  tags?: Record< string, string >;
}

interface ProbeData {
  streams?: ProbeStream[];
  format?: {
    format_name?: string;
    duration?: string;
    bit_rate?: string;
    tags?: Record< string, string >;
  };
}


class MetadataProcessor {
  private getPath ( media: MediaSourceRecord ) : string {
    const root = resolve( media.root_path );
    const path = resolve( root, media.root_relative_path );
    const relativePath = relative( root, path );

    if ( relativePath === '..' || relativePath.startsWith( `..${ sep }` ) )
      throw new Error( `Media path escapes root: ${ media.root_relative_path }` );

    return path;
  }

  private async probe ( path: string, mediaType: MediaSourceRecord[ 'media_type' ], signal: AbortSignal ) : Promise< MediaMetadata > {
    signal.throwIfAborted();

    const { stdout } = await execFileAsync(
      'ffprobe', [ '-v', 'error', '-show_format', '-show_streams', '-of', 'json', path ],
      { encoding: 'utf8', timeout: 60_000, maxBuffer: 8 * 1024 * 1024, signal }
    );

    signal.throwIfAborted();

    const probe = JSON.parse( stdout ) as ProbeData;
    const streams = probe.streams ?? [], format = probe.format ?? {};
    const video = streams.find( stream => stream.codec_type === 'video' && ! stream.disposition?.attached_pic ) ??
      streams.find( stream => stream.codec_type === 'video' );
    const audio = streams.find( stream => stream.codec_type === 'audio' );
    const primary = mediaType === 'audio' ? audio : video ?? audio;
    const tags = { ...format.tags, ...primary?.tags };

    const number = ( value: string | number | undefined ) : number | null => {
      if ( value === undefined || value === '' ) return null;

      const parsed = Number( value );
      return Number.isFinite( parsed ) ? parsed : null;
    };

    const positive = ( value: string | number | undefined ) : number | null => {
      const parsed = number( value );
      return parsed !== null && parsed > 0 ? parsed : null;
    };

    const parseRate = ( value?: string ) : number | null => {
      if ( ! value ) return null;

      const [ num, den ] = value.split( '/' ).map( Number );
      if ( ! den || ! Number.isFinite( num ) || ! Number.isFinite( den ) ) return null;
      return num / den;
    };

    const date = ( ...keys: string[] ) : string | null => {
      for ( const key of keys ) {
        const value = Object.entries( tags ).find( ( [ name ] ) => name.toLowerCase() === key )?.[ 1 ];
        if ( ! value ) continue;

        const compact = value.match( /^(\d{4})(\d{2})(\d{2})$/ );
        if ( compact ) return `${ compact[ 1 ] }-${ compact[ 2 ] }-${ compact[ 3 ] }`;

        const match = value.match( /^\d{4}(?:-\d{2}(?:-\d{2})?)?/ );
        if ( match ) return match[ 0 ];
      }

      return null;
    };

    return {
      durationMs: [ 'video', 'audio' ].includes( mediaType )
        ? positive( format.duration ) === null
          ? null
          : Math.round( Number( format.duration ) * 1000 )
        : null,
      width: positive( video?.width ),
      height: positive( video?.height ),
      frameRate: mediaType === 'video'
        ? parseRate( video?.avg_frame_rate ) ?? parseRate( video?.r_frame_rate )
        : null,
      bitrate: positive( format.bit_rate ) ?? positive( primary?.bit_rate ),
      container: ( format.format_name?.split( ',' )[ 0 ] ?? extname( path ).slice( 1 ) ) || null,
      videoCodec: video?.codec_name ?? null,
      audioCodec: audio?.codec_name ?? null,
      sampleRate: positive( audio?.sample_rate ),
      channels: positive( audio?.channels ),
      encoding: null,
      language: tags.language ?? null,
      releaseDate: date( 'date', 'year', 'release_date' ),
      recordedAt: date( 'creation_time', 'recorded_date', 'date_recorded' ),
      metadata: {
        format: format.format_name ?? null, tags,
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

  private async readTextMetadata ( path: string, size: number, signal: AbortSignal ) : Promise< MediaMetadata > {
    signal.throwIfAborted();
    const file = await open( path );

    try {
      signal.throwIfAborted();

      const buffer = Buffer.alloc( 4096 );
      const { bytesRead } = await file.read( buffer, 0, buffer.length, 0 );
      const sample = buffer.subarray( 0, bytesRead );
      let encoding = 'UTF-8';

      if ( sample[ 0 ] === 0xef && sample[ 1 ] === 0xbb && sample[ 2 ] === 0xbf) encoding = 'UTF-8 BOM';
      else if ( sample[ 0 ] === 0xff && sample[ 1 ] === 0xfe ) encoding = 'UTF-16 LE';
      else if ( sample[ 0 ] === 0xfe && sample[ 1 ] === 0xff ) encoding = 'UTF-16 BE';
      else {
        try { new TextDecoder( 'utf-8', { fatal: true } ).decode( sample ) }
        catch { encoding = 'Windows-1252' }
      }

      signal.throwIfAborted();

      return {
        durationMs: null, width: null, height: null, frameRate: null,
        bitrate: null, container: 'text', videoCodec: null, audioCodec: null,
        sampleRate: null, channels: null, encoding, language: null,
        releaseDate: null, recordedAt: null,
        metadata: { mediaType: 'text', textEncoding: encoding, fileSize: size }
      };
    } finally {
      await file.close();
    }
  }

  public async process ( job: MediaJob, signal: AbortSignal ) : Promise< void > {
    if ( job.job_type !== 'metadata' || job.media_id === null ) throw new Error( 'Invalid metadata job' );
    signal.throwIfAborted();

    const media = db.prepare( `
      SELECT media.id, media.media_type, media.file_name, media.file_size,
        media.file_mtime_ms, media.is_available, media.root_relative_path,
        media_roots.path AS root_path
      FROM media
      JOIN media_roots ON media_roots.id = media.media_root_id
      WHERE media.id = ?
    ` ).get( job.media_id ) as MediaSourceRecord | undefined;

    if ( ! media || ! media.is_available ) return;

    const path = this.getPath( media );
    const info = await stat( path );

    signal.throwIfAborted();

    if ( info.size !== media.file_size || ( media.file_mtime_ms !== null && info.mtimeMs !== media.file_mtime_ms ) )
      throw new Error( `Media changed since scan: ${ path }` );

    const metadata = media.media_type === 'text'
      ? await this.readTextMetadata( path, info.size, signal )
      : await this.probe( path, media.media_type, signal );

    signal.throwIfAborted();

    db.prepare( `
      UPDATE media SET
        duration_ms = ?, width = ?, height = ?, frame_rate = ?,
        bitrate = ?, container = ?, video_codec = ?, audio_codec = ?,
        sample_rate = ?, channels = ?, encoding = ?, language = ?,
        release_date = ?, recorded_at = ?, metadata_json = ?,
        updated_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )
      WHERE id = ? AND is_available = 1
    ` ).run(
      metadata.durationMs, metadata.width, metadata.height,
      metadata.frameRate, metadata.bitrate, metadata.container,
      metadata.videoCodec, metadata.audioCodec, metadata.sampleRate,
      metadata.channels, metadata.encoding, metadata.language,
      metadata.releaseDate, metadata.recordedAt,
      JSON.stringify( metadata.metadata ), media.id
    );
  }
}


export const metadataProcessor = new MetadataProcessor();
export const processMetadataJob = ( job: MediaJob, signal: AbortSignal ) : Promise< void > =>
  metadataProcessor.process( job, signal );
