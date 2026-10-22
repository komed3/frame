import { Config } from '@/src/server/core/Config';
import { JobQueue } from '@/src/server/job/Queue';
import { registry } from '@/src/server/job/Registry';
import type { JobRecord } from '@/src/shared/types/job';
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
  private readonly workerId: string;
  private readonly controller = new AbortController();

  private loops: Promise< void >[] = [];
  private started = false;

  private async process ( job: JobRecord, workerId: string ) : Promise< void > {
    const { signal } = this.controller;

    try {
      const handler = registry.get( job.kind );
      const result = await handler.execute( { job, signal } );

      if ( signal.aborted ) return JobQueue.release( job.id, workerId );
      if ( result?.commit ) await result.commit();

      JobQueue.complete( job.id, workerId );
      console.info( `[Worker] Job ${ job.id } (${ job.kind }) completed.` );
    } catch ( err ) {
      if ( signal.aborted ) {
        try { JobQueue.release( job.id, workerId ) }
        catch ( E ) { console.error( `[Worker] Could not release job ${ job.id }:`, E ) }
        return;
      }

      const delay = Math.min(
        Config.get( 'WORKER_RETRY_DELAY_MS' ) * 2 ** Math.min( job.attempts - 1, 30 ),
        Config.get( 'WORKER_MAX_RETRY_DELAY_MS' )
      );

      try {
        JobQueue.retry( job.id, workerId, err, delay );
        const current = JobQueue.get( job.id );

        if ( current?.status === 'failed' ) console.error( `[Worker] Job ${ job.id } failed permanently:`, err );
        else console.warn( `[Worker] Job ${ job.id } failed; retry scheduled.`, err );
      } catch ( err ) {
        console.error( `[Worker] Could not update failed job ${ job.id }:`, err );
      }
    }
  }

  private async runLoop ( workerId: string ) : Promise< void > {
    const { signal } = this.controller;
    const pollIntervalMs = Config.get( 'WORKER_POLL_INTERVAL_MS' );

    while ( ! signal.aborted ) {
      try {
        const job = JobQueue.claim( workerId );
        if ( job ) { await this.process( job, workerId ); continue }

        await wait( pollIntervalMs, signal );
      } catch ( err ) {
        if ( signal.aborted ) break;
        console.error( '[Worker] Queue loop failed:', err );

        try { await wait( pollIntervalMs, signal ) }
        catch { break }
      }
    }
  }

  public constructor () {
    this.workerId = `frame-${ process.pid }-${ randomUUID() }`;
  }

  public start () : void {
    if ( this.started ) return;

    this.started = true;
    const recovered = JobQueue.recover();
    if ( recovered ) console.info( `[Worker] Recovered ${ recovered } interrupted job(s).` );

    this.loops = Array.from( { length: Config.get( 'WORKER_CONCURRENCY' ) }, ( _, index ) => {
      console.info( `[Worker] Starting loop ${ index + 1 } of ${ Config.get( 'WORKER_CONCURRENCY' ) } ...` );
      return this.runLoop( `${ this.workerId }-${ index + 1 }` );
    } );
  }

  public async stop () : Promise< void > {
    if ( ! this.started ) return;

    this.controller.abort();
    await Promise.all( this.loops );

    console.info( `[Worker] Stopped ${ Config.get( 'WORKER_CONCURRENCY' ) } loop(s).` );
    this.loops = [];
    this.started = false;
  }
}
