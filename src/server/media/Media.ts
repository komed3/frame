import { as, conn } from '@/src/server/core/Database';
import type { MediaFileInput, MediaListOptions, MediaRecord, MediaRow, MediaType, MediaUpdate } from '@/src/shared/types/media';


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
