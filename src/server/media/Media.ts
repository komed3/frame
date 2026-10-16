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
    return row ? Media.mapRow( row ) : null;
  }

  public static getByPath ( rootId: number, path: string ) : MediaRecord | null {
    Media.assertRootId( rootId );
    Media.assertRelativePath( path );

    const row = as< MediaRow | undefined >( conn().prepare(
      `${ SELECT_MEDIA } WHERE root_id = ? AND path = ?`
    ).get( rootId, path ) );

    return row ? Media.mapRow( row ) : null;
  }

  public static list ( options: MediaListOptions = {} ) : MediaRecord[] {
    const { rootId, type, availableOnly = false, limit = 100, offset = 0 } = options;
    const conditions: string[] = [], values: ( string | number )[] = [];

    if ( rootId !== undefined ) {
      Media.assertRootId( rootId );

      conditions.push( 'root_id = ?' );
      values.push( rootId );
    }

    if ( type !== undefined ) {
      if ( ! MEDIA_TYPES.includes( type ) ) throw new Error( `Invalid media type: ${ type }` );

      conditions.push( 'type = ?' );
      values.push( type );
    }

    if ( availableOnly ) conditions.push( 'available = 1' );
    if ( ! Number.isSafeInteger( limit ) || limit < 1 ) throw new Error( `Invalid media limit: ${ limit }` );
    if ( ! Number.isSafeInteger( offset ) || offset < 0 ) throw new Error( `Invalid media offset: ${ offset }` );

    const where = conditions.length ? `WHERE ${ conditions.join( ' AND ' ) }` : '';
    const rows = as< MediaRow[] >( conn().prepare(
      `${ SELECT_MEDIA } ${ where } ORDER BY id LIMIT ? OFFSET ?`
    ).all( ...values, limit, offset ) );

    return rows.map( row => Media.mapRow( row ) );
  }

  public static registerFile ( input: MediaFileInput ) : number {
    Media.assertRootId( input.rootId );
    Media.assertRelativePath( input.path );

    if ( ! input.fileName || input.fileName.includes( '/' ) || input.fileName.includes( '\\' ) )
      throw new Error( `Invalid media file name: ${ input.fileName }` );

    if ( ! MEDIA_TYPES.includes( input.type ) )
      throw new Error( `Invalid media type: ${ input.type }` );

    if ( ! Number.isSafeInteger( input.sizeBytes ) || input.sizeBytes < 0 )
      throw new Error( `Invalid media file size: ${ input.sizeBytes }` );

    const row = as< { id: number } | undefined >( conn().prepare( `
      INSERT INTO media (
        root_id, path, file_name, type, mime_type, size_bytes, modified_at, scanned_at
      )
      VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )
      )
      ON CONFLICT ( root_id, path ) DO UPDATE SET
        file_name = excluded.file_name,
        type = excluded.type,
        mime_type = excluded.mime_type,
        file_hash = CASE
          WHEN media.size_bytes IS NOT excluded.size_bytes
            OR media.modified_at IS NOT excluded.modified_at
          THEN NULL
          ELSE media.file_hash
        END,
        fingerprint = CASE
          WHEN media.size_bytes IS NOT excluded.size_bytes
            OR media.modified_at IS NOT excluded.modified_at
          THEN NULL
          ELSE media.fingerprint
        END,
        size_bytes = excluded.size_bytes,
        modified_at = excluded.modified_at,
        available = 1,
        scanned_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ),
        updated_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )
      RETURNING id
    ` ).get(
      input.rootId, input.path, input.fileName, input.type, input.mimeType ?? null,
      input.sizeBytes, input.modifiedAt ?? null
    ) );

    if ( ! row ) throw new Error( `Could not register media file: ${ input.path }` );
    return row.id;
  }

  public static update ( id: number, patch: MediaUpdate ) : void {
    Media.assertMediaId( id );

    const columns = Object.entries( UPDATE_COLUMNS ) as [ keyof MediaUpdate, string ][];
    const assignments: string[] = [], values: ( string | number | null )[] = [];

    for ( const [ key, column ] of columns ) {
      const value = patch[ key ];
      if ( value === undefined ) continue;

      if ( key === 'data' ) {
        if ( ! value || typeof value !== 'object' || Array.isArray( value ) )
          throw new Error( 'Media data must be an object' );

        values.push( JSON.stringify( value ) );
      } else {
        values.push( value as string | number | null );
      }

      assignments.push( `${ column } = ?` );
    }

    if ( ! assignments.length ) return;

    assignments.push( `updated_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )` );
    const result = conn().prepare( `UPDATE media SET ${ assignments.join( ', ' ) } WHERE id = ?` ).run( ...values, id );

    if ( Number( result.changes ) !== 1 ) throw new Error( `Media ${ id } does not exist` );
  }
}
