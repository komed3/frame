import { confirm } from '@/src/maintenance/utils/prompt';
import { ui } from '@/src/maintenance/utils/ui';
import { db } from '@/src/server/core/Database';
import { Command } from 'commander';


export const registerDbCommands = ( program: Command ) : void => {
  const dbCommand = program
    .command( 'db' )
    .description( 'Manage the database' );

  dbCommand
    .command( 'migrations' )
    .description( 'List applied database migrations' )
    .action( () => console.table( db.listMigrations().map( migration => ( {
      name: migration.name,
      checksum: migration.checksum.slice( 0, 12 ),
      appliedAt: migration.appliedAt
    } ) ) ) );
}
