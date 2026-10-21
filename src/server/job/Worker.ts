import { JobQueue } from '@/src/server/job/Queue';
import { JobRegistry } from '@/src/server/job/Registry';
import type { JobRecord, WorkerOptions } from '@/src/shared/types/job';
import { randomUUID } from 'node:crypto';


export class Worker {
  private readonly concurrency: number;
  private readonly pollIntervalMs: number;
  private readonly retryDelayMs: number;
  private readonly maxRetryDelayMs: number;
  private readonly workerId: string;
  private readonly controller = new AbortController();
  private loops: Promise< void >[] = [];
  private started = false;
}
