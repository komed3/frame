import type { MediaRecord, MediaType, MediaUpdate } from '@/src/shared/types/media';


export type JobKind = 'scan' | 'metadata' | 'tracks' | 'preview' | 'frames' | 'wave' | 'text';
export type JobStatus = 'pending' | 'running' | 'done' | 'failed' | 'cancelled';

export interface JobRecord {
  id: number;
  rootId: number | null;
  mediaId: number | null;
  kind: JobKind;
  status: JobStatus;
  priority: number;
  attempts: number;
  maxAttempts: number;
  runAfterMs: number;
  lockedAtMs: number | null;
  worker: string | null;
  error: string | null;
  payload: Record< string, unknown >;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
}

export interface JobRow extends Omit< JobRecord, 'payload' > {
  payloadJson: string;
}

export interface EnqueueJob {
  kind: JobKind;
  rootId?: number;
  mediaId?: number;
  priority?: number;
  maxAttempts?: number;
  runAfterMs?: number;
  payload?: Record< string, unknown >;
}

export interface JobContext {
  job: JobRecord;
  signal: AbortSignal;
}

export interface JobResult {
  commit?: () => void | Promise< void >;
}

export interface JobHandler {
  execute ( context: JobContext ) : Promise< void | JobResult >;
}

export interface JobListFilters {
  kind?: JobKind;
  rootId?: number;
  mediaId?: number;
}


// --- scan ---

export interface ExistingMedia {
  id: number;
  path: string;
  fileName: string;
  type: MediaType;
  mimeType: string | null;
  sizeBytes: number;
  modifiedAt: string | null;
  fingerprint: string | null;
  available: number;
  title: string | null;
}

export interface ScannedFile {
  absolutePath: string;
  path: string;
  fileName: string;
  type: MediaType;
  mimeType: string;
  sizeBytes: number;
  mtimeMs: number;
  modifiedAt: string;
  fingerprint: string;
}

export interface ScanStats {
  discovered: number;
  ignored: number;
  errors: number;
}


// --- metadata ---

export interface ProbeStream {
  index?: number;
  codec_type?: string;
  codec_name?: string;
  codec_long_name?: string;
  profile?: string;
  width?: number;
  height?: number;
  avg_frame_rate?: string;
  r_frame_rate?: string;
  bit_rate?: string;
  sample_rate?: string;
  channels?: number;
  channel_layout?: string;
  pix_fmt?: string;
  sample_fmt?: string;
  disposition?: {
    attached_pic?: number;
    default?: number;
    forced?: number;
  };
  tags?: Record< string, string >;
}

export interface ProbeData {
  streams?: ProbeStream[];
  format?: {
    format_name?: string;
    duration?: string;
    bit_rate?: string;
    tags?: Record< string, string >;
  };
}

export type ExtractedMetadata = MediaUpdate;


// --- assets ---

export interface AssetSource {
  media: MediaRecord;
  path: string;
  fingerprint: string;
}
