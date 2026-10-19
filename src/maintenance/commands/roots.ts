import { ui } from '@/src/maintenance/utils/ui';
import { MediaRoots } from '@/src/server/media/Roots';
import { resolveId } from '@/src/server/utils';
import { Command } from 'commander';


export const registerRootCommands = ( program: Command ) : void => {
  const rootCommand = program
    .command( 'root' )
    .description( 'Manage media roots' );
}
