import { jobQueue } from '@/src/server/jobs/queue';
import type { JobProcessor } from '@/src/shared/types';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';


export class JobWorker {
  private stopped = false;
  private running?: Promise< void >;

  public constructor (
    private readonly processJob: JobProcessor,
    private readonly idleDelayMs = 1000,
    private readonly errorDelayMs = 5000
  ) {}
}
