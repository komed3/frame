export type MediaType = 'video' | 'audio' | 'image' | 'text';

export type MediaAssetType = 'poster' | 'thumb' | 'frames' | 'wave' | 'text';

export type MediaJobType = 'scan' | 'metadata' | MediaAssetType;

export type MediaJobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface MediaRoot {
  id: number;
  path: string;
}

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
  file_name: string;
  file_size: number;
  file_mtime_ms: number | null;
  root_path: string;
  root_relative_path: string;
  is_available: number;
}

export interface MediaAssetSource extends MediaSourceRecord {
  content_hash: string | null;
  duration_ms: number | null;
  width: number | null;
  height: number | null;
  audio_codec: string | null;
}

export interface ScannedFile {
  root: MediaRoot;
  path: string;
  relativePath: string;
  rootRelativePath: string;
  fileName: string;
  type: MediaType;
  mime: string;
  title: string;
  size: number;
  mtimeMs: number;
  hash: string;
}

export interface ExistingMedia {
  id: number;
  relative_path: string;
  media_root_id: number | null;
  root_relative_path: string | null;
  file_name: string;
  media_type: MediaType;
  mime_type: string | null;
  title: string | null;
  file_size: number;
  file_mtime_ms: number | null;
  content_hash: string | null;
  metadata_json: string;
  is_available: number;
}

export interface ScanResult {
  discovered: number;
  ignored: number;
  errors: number;
}

export interface MediaAssetRecord {
  id: number;
  media_id: number;
  asset_type: MediaAssetType;
  relative_path: string;
  source_fingerprint: string;
  width: number | null;
  height: number | null;
  metadata_json: string;
}

export interface AssetFrame {
  index: number;
  timeMs: number;
  path: string;
}

export interface FramesManifest {
  version: 1;
  durationMs: number;
  intervalMs: number;
  width: number;
  height: number;
  frames: AssetFrame[];
}

export interface WaveHeader {
  format: 'FRMWAV1';
  sampleRate: number;
  pointCount: number;
  durationSeconds: number;
  values: 'signed-int16-min-max';
}

export interface MediaMetadata {
  durationMs: number | null;
  width: number | null;
  height: number | null;
  frameRate: number | null;
  bitrate: number | null;
  container: string | null;
  videoCodec: string | null;
  audioCodec: string | null;
  sampleRate: number | null;
  channels: number | null;
  encoding: string | null;
  language: string | null;
  releaseDate: string | null;
  recordedAt: string | null;
  metadata: Record<string, unknown>;
}

export type JobProcessor = ( job: MediaJob, signal: AbortSignal ) => Promise< void >;
