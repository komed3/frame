export type MediaType = 'video' | 'audio' | 'image' | 'text' | 'other';

export type MediaJobType =
  | 'scan' | 'metadata' | 'poster' | 'scrubber' | 'image_preview'
  | 'text_preview' | 'audio_cover' | 'waveform';

/**
 * Asset types supported by the media_assets database table.
 *
 * poster: Large representative frame from a video.
 * scrubber: Small video frames plus a time-indexed manifest.
 * image_preview: Reduced preview of a static image file, not a video frame.
 * waveform: Binary amplitude data.
 */
export type MediaAssetType =
  | 'poster' | 'scrubber' | 'image_preview' | 'text_preview'
  | 'audio_cover' | 'waveform';

export interface MediaJob {
  id: number;
  media_id: number | null;
  job_type: MediaJobType;
  attempts: number;
  max_attempts: number;
}

export interface MediaSourceRecord {
  id: number;
  media_type: MediaType;
  file_size: number;
  file_mtime_ms: number | null;
  root_path: string;
  root_relative_path: string | null;
  is_available: number;
}

export interface MediaAssetSource extends MediaSourceRecord {
  content_hash: string | null;
  duration_ms: number | null;
  width: number | null;
  height: number | null;
  audio_codec: string | null;
  file_name: string;
}

export interface MediaAssetQueueRecord {
  id: number;
  media_type: MediaType;
  file_name: string;
  audio_codec: string | null;
  is_available: number;
}

export interface MediaAssetRecord {
  id: number;
  relative_path: string;
  metadata_json: string;
}

export interface MediaAssetMetadata {
  thumbnailPath?: string;
  [ key: string ]: unknown;
}
