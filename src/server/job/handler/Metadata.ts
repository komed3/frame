import { Config } from '@/src/server/core/Config';
import { parseDate, parsePositive, parseRate } from '@/src/server/job/handler/parse';
import { Media } from '@/src/server/media/Media';
import { MediaRoots } from '@/src/server/media/Roots';
import { execFileAsync } from '@/src/server/utils';
import type { ExtractedMetadata, JobContext, JobHandler, ProbeData } from '@/src/shared/types/job';
import type { MediaType } from '@/src/shared/types/media';
import { open, stat } from 'node:fs/promises';
import { extname } from 'node:path';


export class MetadataJob implements JobHandler {
  private async probe ( path: string, type: MediaType, signal: AbortSignal ) : Promise< ExtractedMetadata > {
    signal.throwIfAborted();

    const { stdout } = await execFileAsync( 'ffprobe', [
      '-v', 'error', '-show_format', '-show_streams', '-of', 'json', path
    ], {
      encoding: 'utf8', timeout: Config.get( 'FFPROBE_TIMEOUT_MS' ),
      maxBuffer: 8 * 1024 * 1024, signal
    } );

    signal.throwIfAborted();

    const probe = JSON.parse( stdout ) as ProbeData;
    const streams = probe.streams ?? [], format = probe.format ?? {};
    const video = streams.find( s => s.codec_type === 'video' && ! s.disposition?.attached_pic ) ??
      streams.find( s => s.codec_type === 'video' );
    const audio = streams.find( s => s.codec_type === 'audio' );
    const primary = type === 'audio' ? audio : video ?? audio;
    const tags = { ...format.tags, ...primary?.tags };
    const duration = parsePositive( format.duration );

    return {
      durationMs: type === 'video' || type === 'audio'
        ? duration === null ? null : Math.round( duration * 1000 )
        : null,
      width: parsePositive( video?.width ),
      height: parsePositive( video?.height ),
      fps: type === 'video'
        ? parseRate( video?.avg_frame_rate ) ?? parseRate( video?.r_frame_rate )
        : null,
      bitrate: parsePositive( format.bit_rate ) ?? parsePositive( primary?.bit_rate ),
      container: ( format.format_name?.split( ',' )[ 0 ] ?? extname( path ).slice( 1 ) ) || null,
      videoCodec: video?.codec_name ?? null,
      audioCodec: audio?.codec_name ?? null,
      sampleRate: parsePositive( audio?.sample_rate ),
      channels: parsePositive( audio?.channels ),
      encoding: null,
      language: tags.language ?? null,
      releasedAt: parseDate( tags, 'date', 'year', 'release_date' ),
      recordedAt: parseDate( tags, 'creation_time', 'recorded_date', 'date_recorded' ),
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
    if ( info.size !== media.sizeBytes ) throw new Error( `Media changed since scan: ${ path }` );

    const metadata = media.type === 'text'
      ? await this.probeText( path, info.size, signal )
      : await this.probe( path, media.type, signal );

    signal.throwIfAborted();
    Media.update( media.id, metadata );

    console.info( `[Metadata] Media ${ media.id } (${ media.path }) processed.` );
  }
}
