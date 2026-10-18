import { MediaSearchTextField } from '@/src/shared/types/search';


const MAX_LIMIT = 500;

const TEXT_COLUMNS: Record< MediaSearchTextField, string > = {
  path: 'm.path', fileName: 'm.file_name', mimeType: 'm.mime_type', fileHash: 'm.file_hash',
  fingerprint: 'm.fingerprint', title: 'm.title', description: 'm.description',
  creator: 'm.creator', language: 'm.language', container: 'm.container',
  videoCodec: 'm.video_codec', audioCodec: 'm.audio_codec', encoding: 'm.encoding'
};
