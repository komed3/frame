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

  dbCommand
    .command( 'stats' )
    .description( 'Show general database statistics' )
    .action( () => {
      const stats = db.getStats();

      console.table( [
        { stat: 'Database path', value: stats.path },
        { stat: 'SQLite version', value: stats.sqliteVersion },
        { stat: 'Tables', value: stats.tableCount },
        { stat: 'Rows', value: stats.rowCount },
        { stat: 'Applied migrations', value: stats.migrationCount },
        { stat: 'Disk usage', value: `${ stats.sizeBytes.toLocaleString() } bytes` },
        { stat: 'Pages', value: stats.pageCount },
        { stat: 'Page size', value: `${ stats.pageSize } bytes` },
        { stat: 'Free pages', value: stats.freePages },
        {
          stat: 'Integrity check',
          value: stats.integrityCheck === 'ok' ? ui.success( 'ok' ) ?? 'ok' :
            ui.error( stats.integrityCheck ) ?? stats.integrityCheck
        }
      ] );
    } );

  dbCommand
    .command( 'reset' )
    .description( 'Delete the database and reapply migrations' )
    .option( '-y, --yes', 'Skip confirmation' )
    .action( async ( options: { yes?: boolean } ) => {
      if ( ! options.yes && ! await confirm(
        'This permanently deletes all database data. Is Frame stopped, and do you want to continue?'
      ) ) {
        ui.info( 'Cancelled.' );
        return;
      }

      const count = db.reset();
      ui.success( `Database reset. Applied ${ count } migration(s).` );
    } );
}
