import type { MediaRecord, MediaRow } from '@/src/shared/types/media';
import type {
  MediaSearchAssetKind, MediaSearchDateField, MediaSearchNumberField, MediaSearchSort,
  MediaSearchTextField
} from '@/src/shared/types/search';


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
}
