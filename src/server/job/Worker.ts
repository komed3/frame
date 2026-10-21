import { JobQueue } from '@/src/server/job/Queue';
import { JobRegistry } from '@/src/server/job/Registry';
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

  public constructor (
    private readonly registry: JobRegistry,
    options: WorkerOptions = {}
  ) {
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
}
