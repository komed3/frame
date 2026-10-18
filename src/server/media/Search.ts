import { MediaSearchDateField, MediaSearchNumberField, MediaSearchTextField } from '@/src/shared/types/search';


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
