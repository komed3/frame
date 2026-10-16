import { as, conn } from '@/src/server/core/Database';
import type { MediaFileInput, MediaListOptions, MediaRecord, MediaRow, MediaType, MediaUpdate } from '@/src/shared/types/media';


export const MEDIA_TYPES: MediaType[] = [ 'video', 'audio', 'image', 'text', 'other' ];

const SELECT_MEDIA = `
  SELECT
    id, root_id AS rootId, path, file_name AS fileName, type, mime_type AS mimeType,
    size_bytes AS sizeBytes, modified_at AS modifiedAt, file_hash AS fileHash, fingerprint,
    available, title, description, creator, rating, released_at AS releasedAt,
    recorded_at AS recordedAt, language, duration_ms AS durationMs, width, height, fps,
    bitrate, container, video_codec AS videoCodec, audio_codec AS audioCodec,
    sample_rate AS sampleRate, channels, encoding, data_json AS dataJson,
    scanned_at AS scannedAt, created_at AS createdAt, updated_at AS updatedAt
  FROM media
`;

const UPDATE_COLUMNS = {
  fileHash: 'file_hash', fingerprint: 'fingerprint', title: 'title', description: 'description',
  creator: 'creator', rating: 'rating', releasedAt: 'released_at', recordedAt: 'recorded_at',
  language: 'language', durationMs: 'duration_ms', width: 'width', height: 'height', fps: 'fps',
  bitrate: 'bitrate', container: 'container', videoCodec: 'video_codec', audioCodec: 'audio_codec',
  sampleRate: 'sample_rate', channels: 'channels', encoding: 'encoding', data: 'data_json'
} as const;


export class Media {
  private static assertMediaId ( id: number ) : void {
    if ( ! Number.isSafeInteger( id ) || id < 1 ) throw new Error( `Invalid media ID: ${ id }` );
  }

  private static assertRootId ( rootId: number ) : void {
    if ( ! Number.isSafeInteger( rootId ) || rootId < 1 ) throw new Error( `Invalid media root ID: ${ rootId }` );
  }

  private static assertRelativePath ( path: string ) : void {
    if (
      typeof path !== 'string' || ! path || path.includes( '\0' ) || path.includes( '\\' ) ||
      path.startsWith( '/' ) || path.split( '/' ).some( part => ! part || part === '.' || part === '..' )
    ) throw new Error( `Invalid relative media path: ${ path }` );
  }

  private static mapRow ( row: MediaRow ) : MediaRecord {
    const data = JSON.parse( row.dataJson ) as unknown;

    if ( ! data || typeof data !== 'object' || Array.isArray( data ) )
      throw new Error( `Invalid media data JSON for media ${ row.id }` );

    return { ...row, available: row.available === 1, data: data as Record< string, unknown > };
  }

  public static get ( id: number ) : MediaRecord | null {
    Media.assertMediaId( id );

    const row = as< MediaRow | undefined >( conn().prepare( `${ SELECT_MEDIA } WHERE id = ?` ).get( id ) );
    return row ? this.mapRow( row ) : null;
  }

  public static getByPath ( rootId: number, path: string ) : MediaRecord | null {
    Media.assertRootId( rootId );
    Media.assertRelativePath( path );

    const row = as< MediaRow | undefined >( conn().prepare(
      `${ SELECT_MEDIA } WHERE root_id = ? AND path = ?`
    ).get( rootId, path ) );

    return row ? this.mapRow( row ) : null;
  }
}
