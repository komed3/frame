import type { JobHandler, JobKind } from '@/src/shared/types/job';


export class JobRegistry {
  private readonly handlers = new Map< JobKind, JobHandler >();

  public get ( kind: JobKind ) : JobHandler {
    const handler = this.handlers.get( kind );
    if ( ! handler ) throw new Error( `No handler registered for job kind: ${ kind }` );
    return handler;
  }

  public has ( kind: JobKind ) : boolean {
    return this.handlers.has( kind );
  }

  public register ( kind: JobKind, handler: JobHandler ) : this {
    if ( this.handlers.has( kind ) ) throw new Error( `A handler is already registered for job kind: ${ kind }` );

    this.handlers.set( kind, handler );
    return this;
  }
}


export const registry = new JobRegistry();
