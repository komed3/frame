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

  private async run () : Promise< void > {
    const workerId = randomUUID();
    jobQueue.recoverStale();

    while ( ! this.stopped ) {
      let job;

      try { job = jobQueue.claim( workerId ) }
      catch ( err ) {
        console.error( 'Could not claim a job:', err );
        await delay( this.errorDelayMs );
        continue;
      }

      if ( ! job ) {
        await delay( this.idleDelayMs );
        continue;
      }

      try {
        await this.processJob( job );
        jobQueue.complete( job, workerId );
      } catch ( err ) {
        try { jobQueue.fail( job, workerId, err ) }
        catch ( queueErr ) { console.error( `Could not update job ${ job.id }:`, queueErr ) }

        console.error( `Job ${ job.id } failed:`, err );
      }
    }
  }

  public start () : Promise< void > {
    if ( this.running ) return this.running;

    this.stopped = false;
    this.running = this.run().finally( () => this.running = undefined );

    return this.running;
  }

  public stop () : void {
    this.stopped = true;
  }
}
