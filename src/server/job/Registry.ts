import type { JobHandler, JobKind } from '@/src/shared/types/job';


export class JobRegistry {
  private readonly handlers = new Map< JobKind, JobHandler >();
}
