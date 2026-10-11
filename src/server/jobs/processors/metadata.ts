import { db } from '@/src/server/db';
import type { MediaJob, MediaMetadata, MediaSourceRecord } from '@/src/shared/types';
import { execFile } from 'node:child_process';
import { open, stat } from 'node:fs/promises';
import { extname, relative, resolve, sep } from 'node:path';
import { promisify } from 'node:util';


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


const execFileAsync = promisify( execFile );


class MetadataProcessor {
  public async process ( job: MediaJob ) : Promise< void > {
    if ( job.job_type !== 'metadata' || job.media_id === null )
      throw new Error( 'Invalid metadata job' );

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

    if ( info.size !== media.file_size || ( media.file_mtime_ms !== null && info.mtimeMs !== media.file_mtime_ms ) )
      throw new Error( `Media changed since scan: ${ path }` );

    const metadata = media.media_type === 'text'
      ? await this.readTextMetadata( path, info.size )
      : await this.probe( path, media.media_type );

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
export const processMetadataJob = ( job: MediaJob ) : Promise< void > =>
  metadataProcessor.process( job );
