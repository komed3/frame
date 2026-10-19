import { ui } from '@/src/maintenance/utils/ui';
import { MediaDirectories } from '@/src/server/media/Directories';
import { MediaRoots } from '@/src/server/media/Roots';
import { resolveId } from '@/src/server/utils';
import { Command } from 'commander';


export const registerDirectoryCommands = ( program: Command ) : void => {
  const directoryCommand = program
    .command( 'directory' )
    .description( 'Inspect media directories' );
}
