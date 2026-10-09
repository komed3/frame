import { randomUUID } from 'node:crypto';
import { claimNextJob, completeJob, failJob, recoverStaleJobs } from './queue';
import type { MediaJob } from './queue';


export type JobProcessor = ( job: MediaJob ) => Promise< void >;


const idleDelayMs = 1000;
const errorDelayMs = 5000;

let workerPromise: Promise< void > | undefined;
let stopped = false;


async function runWorker ( processJob: JobProcessor ) : Promise< void > {
  const workerId = randomUUID();
  recoverStaleJobs();

  while ( ! stopped ) {
    let job: MediaJob | undefined;

    try { job = claimNextJob( workerId ) }
    catch ( error ) {
      console.error( 'Failed to claim media job:', error );
      await new Promise( resolve => setTimeout( resolve, errorDelayMs ) );
      continue;
    }

    if ( ! job ) {
      await new Promise( resolve => setTimeout( resolve, idleDelayMs ) );
      continue;
    }

    try {
      await processJob( job );
    } catch ( error ) {
      try { failJob( job, workerId, error ) }
      catch ( failure ) { console.error( `Failed to update media job ${ job.id }:`, failure ) }

      console.error( `Media job ${ job.id } failed:`, error );
      continue;
    }

    try { completeJob( job.id, workerId ) }
    catch ( error ) { console.error( `Failed to complete media job ${ job.id }:`, error ) }
  }
}


export function startWorker ( processJob: JobProcessor ) : Promise< void > {
  if ( workerPromise ) return workerPromise;

  stopped = false;
  workerPromise = runWorker( processJob ).finally( () => workerPromise = undefined );
  return workerPromise;
}


export function stopWorker () : void { stopped = true }
