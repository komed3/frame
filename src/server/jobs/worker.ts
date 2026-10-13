import { jobQueue } from '@/src/server/jobs/queue';
import type { JobProcessor } from '@/src/shared/types';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';


export class JobWorker {
  private stopped = false;
  private running?: Promise< void >;
  private controller?: AbortController;

  public constructor (
    private readonly processJob: JobProcessor,
    private readonly idleDelayMs = 1000,
    private readonly errorDelayMs = 5000
  ) {}

  private async wait ( ms: number, signal: AbortSignal ) : Promise< void > {
    try { await delay( ms, undefined, { signal } ) }
    catch ( err ) { if ( ! signal.aborted ) throw err }
  }

  private async run ( signal: AbortSignal ) : Promise< void > {
    const workerId = randomUUID();
    jobQueue.recoverStale();

    while ( ! signal.aborted ) {
      let job;

      try { job = jobQueue.claim( workerId ) }
      catch ( err ) {
        if ( signal.aborted ) break;

        console.error( 'Could not claim a job:', err );
        await this.wait( this.errorDelayMs, signal );

        continue;
      }

      if ( ! job ) {
        await this.wait( this.idleDelayMs, signal );
        continue;
      }

      try {
        await this.processJob( job, signal );
        jobQueue.complete( job, workerId );
      } catch ( err ) {
        if ( signal.aborted ) {
          try { jobQueue.release( job, workerId ) }
          catch ( queueErr ) { console.error( `Could not release job ${ job.id }:`, queueErr ) }

          break;
        }

        try { jobQueue.fail( job, workerId, err ) }
        catch ( queueErr ) { console.error( `Could not update job ${ job.id }:`, queueErr ) }

        console.error( `Job ${ job.id } failed:`, err );
      }
    }
  }

  public start () : Promise< void > {
    if ( this.running ) return this.running;

    console.log( 'Starting job worker ...' );

    this.stopped = false;
    this.controller = new AbortController();
    this.running = this.run( this.controller.signal ).finally( () => {
      this.running = undefined, this.controller = undefined;
    } );

    return this.running;
  }

  public stop () : void {
    if ( this.stopped ) return;

    console.log( 'Stopping job worker ...' );
    this.stopped = true;
    this.controller?.abort();
  }
}
