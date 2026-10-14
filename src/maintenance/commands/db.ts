import { confirm } from '@/src/maintenance/utils/prompt';
import { ui } from '@/src/maintenance/utils/ui';
import { db } from '@/src/server/core/Database';
import { Command } from 'commander';


export const registerDbCommands = ( program: Command ) : void => {
  const dbCommand = program
    .command( 'db' )
    .description( 'Manage the database' );
}
