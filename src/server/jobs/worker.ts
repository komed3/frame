import { jobQueue } from '@/src/server/jobs/queue';
import type { JobProcessor } from '@/src/shared/types';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';


export class JobWorker {}
