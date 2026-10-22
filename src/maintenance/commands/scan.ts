import { MediaRoots } from '@/src/server/media/Roots';
import { Command } from 'commander';
import { ui } from '../utils/ui';
import { JobQueue } from '@/src/server/job/Queue';


export const registerScanCommands = ( program: Command ) : void => {
  program
    .command( 'scan' )
    .description( 'Queue a scan for every enabled media root' )
    .action( () => {
      const roots = MediaRoots.list( true );

      if ( ! roots.length ) return ui.info( 'No enabled media roots found.' );

      for ( const root of roots ) {
        const id = JobQueue.enqueue( { kind: 'scan', rootId: root.id } );
        ui.success( `Scan job ${ id } queued for root ${ root.id }: ${ root.path }` );
      }

      ui.info( `Queued scans for ${ roots.length } enabled root(s).` );
    } );
}
