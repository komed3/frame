export type JobKind = 'scan' | 'metadata' | 'preview' | 'frames' | 'wave' | 'text';
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

export interface EnqueueJob {
  kind: JobKind;
  rootId?: number;
  mediaId?: number;
  priority?: number;
  maxAttempts?: number;
  runAfterMs?: number;
  payload?: Record< string, unknown >;
}
