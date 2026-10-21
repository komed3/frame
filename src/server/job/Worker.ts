import { JobQueue } from '@/src/server/job/Queue';
import { registry } from '@/src/server/job/Registry';
import type { JobRecord, WorkerOptions } from '@/src/shared/types/job';
import { randomUUID } from 'node:crypto';


export class Worker {
  private readonly concurrency: number;
  private readonly pollIntervalMs: number;
  private readonly retryDelayMs: number;
  private readonly maxRetryDelayMs: number;
  private readonly workerId: string;
  private readonly controller = new AbortController();
  private loops: Promise< void >[] = [];
  private started = false;

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
