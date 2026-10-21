import type { MediaType } from '@/src/shared/types/media';


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

export interface WorkerOptions {
  concurrency?: number;
  pollIntervalMs?: number;
  retryDelayMs?: number;
  maxRetryDelayMs?: number;
  workerId?: string;
}

// --- scan ---

interface ExistingMedia {
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

interface ScannedFile {
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

interface ScanStats {
  discovered: number;
  ignored: number;
  errors: number;
}
