import { JobQueue } from '@/src/server/job/Queue';
import { JobRegistry } from '@/src/server/job/Registry';
import type { JobRecord, WorkerOptions } from '@/src/shared/types/job';
import { randomUUID } from 'node:crypto';
