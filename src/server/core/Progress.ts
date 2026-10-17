import { as, conn } from '@/src/server/core/Database';
import { Media } from '@/src/server/media/Media';
import { assertId } from '@/src/server/utils';
import type { ProgressRecord, ProgressRow } from '@/src/shared/types/progress';


export class Progress {
  private static mapRow ( row: ProgressRow ) : ProgressRecord {
    return { ...row, completed: row.completed === 1 };
  }
}
