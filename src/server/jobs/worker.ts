import { randomUUID } from 'node:crypto';
import { claimNextJob, completeJob, failJob, recoverStaleJobs } from './queue';
import type { MediaJob } from './queue';


export type JobProcessor = ( job: MediaJob ) => Promise< void >;
