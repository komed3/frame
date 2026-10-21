import type { JobHandler, JobKind } from '@/src/shared/types/job';


export class JobRegistry {
  private readonly handlers = new Map< JobKind, JobHandler >();

  public register ( kind: JobKind, handler: JobHandler ) : this {
    if ( this.handlers.has( kind ) ) throw new Error( `A handler is already registered for job kind: ${ kind }` );

    this.handlers.set( kind, handler );
    return this;
  }
}
