export type MediaType = 'video' | 'audio' | 'image' | 'text' | 'other';

export interface MediaRecord {
  id: number;
  rootId: number;
  directoryId: number | null;
  path: string;
  fileName: string;
  type: MediaType;
  mimeType: string | null;
  sizeBytes: number;
  modifiedAt: string | null;
  fileHash: string | null;
  fingerprint: string | null;
  available: boolean;
  title: string | null;
  description: string | null;
  creator: string | null;
  rating: number | null;
  releasedAt: string | null;
  recordedAt: string | null;
  language: string | null;
  durationMs: number | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  bitrate: number | null;
  container: string | null;
  videoCodec: string | null;
  audioCodec: string | null;
  sampleRate: number | null;
  channels: number | null;
  encoding: string | null;
  data: Record<string, unknown>;
  scannedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MediaRow extends Omit< MediaRecord, 'available' | 'data' > {
  available: number;
  dataJson: string;
}

export interface MediaFileInput {
  rootId: number;
  path: string;
  fileName: string;
  type: MediaType;
  mimeType?: string | null;
  sizeBytes: number;
  modifiedAt?: string | null;
}

export type MediaUpdate = Partial< Pick< MediaRecord,
  | 'fileHash' | 'fingerprint' | 'title' | 'description' | 'creator' | 'rating' | 'releasedAt'
  | 'recordedAt' | 'language' | 'durationMs' | 'width' | 'height' | 'fps' | 'bitrate' | 'container'
  | 'videoCodec' | 'audioCodec' | 'sampleRate' | 'channels' | 'encoding' | 'data'
> >;

export interface MediaListOptions {
  rootId?: number;
  directoryId?: number | null;
  type?: MediaType;
  availableOnly?: boolean;
  limit?: number;
  offset?: number;
}
