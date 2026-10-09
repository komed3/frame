import { randomUUID } from 'node:crypto';
import { claimNextJob, completeJob, failJob, recoverStaleJobs } from './queue';
import type { MediaJob } from './queue';


export type JobProcessor = ( job: MediaJob ) => Promise< void >;


const idleDelayMs = 1000;
const errorDelayMs = 5000;

let workerPromise: Promise< void > | undefined;
let stopped = false;
