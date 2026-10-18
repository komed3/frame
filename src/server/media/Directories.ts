import { as, conn, db } from '@/src/server/core/Database';
import { assertId, assertRelativePath } from '@/src/server/utils';
import type { MediaDirectory, MediaDirectoryEntry, MediaDirectoryRow } from '@/src/shared/types/directories';


export class MediaDirectories {
  private static mapRow ( row: MediaDirectoryRow ) : MediaDirectory {
    const { scanGeneration, ...directory } = row;
    return directory;
  }
}