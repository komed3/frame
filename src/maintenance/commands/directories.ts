import { ui } from '@/src/maintenance/utils/ui';
import { MediaDirectories } from '@/src/server/media/Directories';
import { resolveId } from '@/src/server/utils';
import type { MediaDirectoryTree } from '@/src/shared/types/directories';
import { Command } from 'commander';


export const registerDirectoryCommands = ( program: Command ) : void => {
  const directoryCommand = program
    .command( 'directory' )
    .description( 'Inspect media directories' );
}
