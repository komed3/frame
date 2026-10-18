import type { MediaRecord, MediaRow } from '@/src/shared/types/media';
import type {
  MediaSearchAssetKind, MediaSearchDateField, MediaSearchNumberField, MediaSearchQueryMode,
  MediaSearchSort, MediaSearchTextField
} from '@/src/shared/types/search';
import { assertId, normalizeString } from '@/src/server/utils';


const MAX_LIMIT = 500;

const TEXT_COLUMNS: Record< MediaSearchTextField, string > = {
  path: 'm.path', fileName: 'm.file_name', mimeType: 'm.mime_type', fileHash: 'm.file_hash',
  fingerprint: 'm.fingerprint', title: 'm.title', description: 'm.description',
  creator: 'm.creator', language: 'm.language', container: 'm.container',
  videoCodec: 'm.video_codec', audioCodec: 'm.audio_codec', encoding: 'm.encoding'
};

const NUMBER_COLUMNS: Record< MediaSearchNumberField, string > = {
  id: 'm.id', rootId: 'm.root_id', sizeBytes: 'm.size_bytes', rating: 'm.rating',
  durationMs: 'm.duration_ms', width: 'm.width', height: 'm.height', fps: 'm.fps',
  bitrate: 'm.bitrate', sampleRate: 'm.sample_rate', channels: 'm.channels'
};

const DATE_COLUMNS: Record< MediaSearchDateField, string > = {
  modifiedAt: 'm.modified_at', releasedAt: 'm.released_at', recordedAt: 'm.recorded_at',
  scannedAt: 'm.scanned_at', createdAt: 'm.created_at', updatedAt: 'm.updated_at'
};

const SORT_COLUMNS: Record< Exclude< MediaSearchSort, 'relevance' >, string > = {
  id: 'm.id', rootId: 'm.root_id', type: 'm.type',
  title: 'COALESCE( NULLIF( m.title, \'\' ), m.file_name ) COLLATE NOCASE',
  fileName: 'm.file_name COLLATE NOCASE', path: 'm.path COLLATE NOCASE',
  mimeType: 'm.mime_type COLLATE NOCASE', sizeBytes: 'm.size_bytes',
  modifiedAt: 'm.modified_at', fileHash: 'm.file_hash', fingerprint: 'm.fingerprint',
  creator: 'm.creator COLLATE NOCASE', rating: 'm.rating', releasedAt: 'm.released_at',
  recordedAt: 'm.recorded_at', language: 'm.language COLLATE NOCASE',
  durationMs: 'm.duration_ms', width: 'm.width', height: 'm.height', fps: 'm.fps',
  bitrate: 'm.bitrate', container: 'm.container COLLATE NOCASE',
  videoCodec: 'm.video_codec COLLATE NOCASE', audioCodec: 'm.audio_codec COLLATE NOCASE',
  sampleRate: 'm.sample_rate', channels: 'm.channels',
  encoding: 'm.encoding COLLATE NOCASE', scannedAt: 'm.scanned_at',
  createdAt: 'm.created_at', updatedAt: 'm.updated_at'
};

const ASSET_KINDS: MediaSearchAssetKind[] = [ 'poster', 'thumb', 'frames', 'wave', 'text', 'subtitle' ];


export class MediaSearch {
  private static mapRow ( row: MediaRow ) : MediaRecord {
    const data = JSON.parse( row.dataJson ) as unknown;

    if ( ! data || typeof data !== 'object' || Array.isArray( data ) )
      throw new Error( `Invalid media data JSON for media ${ row.id }` );

    return { ...row, available: row.available === 1, data: data as Record< string, unknown > };
  }

  private static normalizeIds ( ids: number[], label: string ) : number[] {
    if ( ! Array.isArray( ids ) ) throw new Error( `${ label } must be an array` );

    const uniqueIds = [ ...new Set( ids ) ];
    uniqueIds.forEach( id => assertId( id, label ) );

    if ( uniqueIds.length > 500 ) throw new Error( `${ label } cannot contain more than 500 IDs` );
    return uniqueIds;
  }

  private static normalizeDate ( value: string, label: string, endOfDay = false ) : string {
    const normalized = normalizeString( value, label );

    if ( ! Number.isFinite( Date.parse( normalized ) ) )
      throw new Error( `Invalid ${ label }: ${ normalized }` );

    if ( /^\d{4}-\d{2}-\d{2}$/.test( normalized ) )
      return `${ normalized }T${ endOfDay ? '23:59:59.999' : '00:00:00.000' }Z`;

    return normalized;
  }

  private static escapeLike ( value: string ) : string {
    return value.replace( /[\\%_]/g, '\\$&' );
  }

  private static buildFtsQuery ( query: string, mode: MediaSearchQueryMode ) : string {
    const value = normalizeString( query, 'Search query' );

    if ( mode === 'phrase' ) {
      if ( ! /[\p{L}\p{N}]/u.test( value ) ) throw new Error( 'Search query contains no searchable terms' );
      return `"${ value.replace( /"/g, '""' ) }"`;
    }

    const terms = value.match( /[\p{L}\p{N}_]+/gu ) ?? [];
    if ( ! terms.length ) throw new Error( 'Search query contains no searchable terms' );

    const operator = mode === 'all' ? ' AND ' : ' OR ';
    return terms.map( term => `"${ term.replace( /"/g, '""' ) }"*` ).join( operator );
  }
}
