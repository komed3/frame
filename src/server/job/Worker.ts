import { JobQueue } from '@/src/server/job/Queue';
import { registry } from '@/src/server/job/Registry';
import type { JobRecord, WorkerOptions } from '@/src/shared/types/job';
import { randomUUID } from 'node:crypto';


const wait = ( ms: number, signal: AbortSignal ) : Promise< void > => new Promise( ( resolve, reject ) => {
  if ( signal.aborted ) return reject( new Error( 'Worker stopped' ) );

  const timer = setTimeout( () => {
    signal.removeEventListener( 'abort', abort );
    resolve();
  }, ms );

  const abort = () => {
    clearTimeout( timer );
    signal.removeEventListener( 'abort', abort );
    reject( new Error( 'Worker stopped' ) );
  };

  signal.addEventListener( 'abort', abort, { once: true } );
} );


export class Worker {
  private readonly concurrency: number;
  private readonly pollIntervalMs: number;
  private readonly retryDelayMs: number;
  private readonly maxRetryDelayMs: number;
  private readonly workerId: string;
  private readonly controller = new AbortController();
  private loops: Promise< void >[] = [];
  private started = false;

  private async process ( job: JobRecord, workerId: string ) : Promise< void > {
    const { signal } = this.controller;

    try {
      const handler = registry.get( job.kind );
      const result = await handler.execute( { job, signal } );

      if ( signal.aborted ) {
        JobQueue.release( job.id, workerId );
        return;
      }

      if ( result?.commit ) await result.commit();

      JobQueue.complete( job.id, workerId );
      console.info( `[Worker] Job ${ job.id } (${ job.kind }) completed.` );
    } catch ( error ) {
      if ( signal.aborted ) {
        try { JobQueue.release( job.id, workerId ) }
        catch ( releaseError ) {
          console.error( `[Worker] Could not release job ${ job.id }:`, releaseError );
        }

        return;
      }

      const delay = Math.min(
        this.retryDelayMs * 2 ** Math.min( job.attempts - 1, 30 ),
        this.maxRetryDelayMs
      );

      try {
        JobQueue.retry( job.id, workerId, error, delay );
        const current = JobQueue.get( job.id );

        if ( current?.status === 'failed' )
          console.error( `[Worker] Job ${ job.id } failed permanently:`, error );
        else
          console.warn( `[Worker] Job ${ job.id } failed; retry scheduled.`, error );
      } catch ( queueError ) {
        console.error( `[Worker] Could not update failed job ${ job.id }:`, queueError );
      }
    }
  }

  private async runLoop ( workerId: string ) : Promise< void > {
    const { signal } = this.controller;

    while ( ! signal.aborted ) {
      try {
        const job = JobQueue.claim( workerId );
        if ( job ) { await this.process( job, workerId ); continue }

        await wait( this.pollIntervalMs, signal );
      } catch ( err ) {
        if ( signal.aborted ) break;
        console.error( '[Worker] Queue loop failed:', err );

        try { await wait( this.pollIntervalMs, signal ) }
        catch { break }
      }
    }
  }

  public constructor ( options: WorkerOptions = {} ) {
    this.concurrency = options.concurrency ?? 1;
    this.pollIntervalMs = options.pollIntervalMs ?? 1000;
    this.retryDelayMs = options.retryDelayMs ?? 1000;
    this.maxRetryDelayMs = options.maxRetryDelayMs ?? 60000;
    this.workerId = options.workerId ?? `frame-${ process.pid }-${ randomUUID() }`;

    if ( ! Number.isSafeInteger( this.concurrency ) || this.concurrency < 1 )
      throw new Error( 'Worker concurrency must be a positive integer' );

    for ( const [ name, value ] of Object.entries( {
      pollIntervalMs: this.pollIntervalMs, retryDelayMs: this.retryDelayMs,
      maxRetryDelayMs: this.maxRetryDelayMs
    } ) ) if ( ! Number.isSafeInteger( value ) || value < 1 )
      throw new Error( `${ name } must be a positive integer` );
  }

  public start () : void {
    if ( this.started ) return;

    this.started = true;
    const recovered = JobQueue.recover();
    if ( recovered ) console.info( `[Worker] Recovered ${ recovered } interrupted job(s).` );

    this.loops = Array.from( { length: this.concurrency }, ( _, index ) =>
      this.runLoop( `${ this.workerId }-${ index + 1 }` )
    );
  }

  public async stop () : Promise< void > {
    if ( ! this.started ) return;

    this.controller.abort();
    await Promise.all( this.loops );

    this.loops = [];
    this.started = false;
  }
}
