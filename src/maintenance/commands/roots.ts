import { ui } from '@/src/maintenance/utils/ui';
import { MediaRoots } from '@/src/server/media/Roots';
import { resolveId } from '@/src/server/utils';
import { Command } from 'commander';


export const registerRootCommands = ( program: Command ) : void => {
  const rootCommand = program
    .command( 'root' )
    .description( 'Manage media roots' );

  rootCommand
    .command( 'list' )
    .description( 'List media roots' )
    .option( '--enabled', 'Show only enabled roots' )
    .action( ( options: { enabled?: boolean } ) => {
      const roots = MediaRoots.list( !! options.enabled );
      if ( ! roots.length ) return ui.info( 'No media roots found.' );

      console.table( roots.map( root => ( {
        id: root.id, enabled: root.enabled, path: root.path,
        scannedAt: root.scannedAt, createdAt: root.createdAt
      } ) ) );
    } );

  rootCommand
    .command( 'add <path>' )
    .description( 'Register an existing media root' )
    .option( '--disabled', 'Register the root as disabled' )
    .action( ( path: string, options: { disabled?: boolean } ) => {
      const id = MediaRoots.add( path, ! options.disabled );

      ui.success( `Registered media root ${ id }: ${ ui.value( path ) }` );
      ui.info( `The registered root was ${ options.disabled ? 'disabled' : 'enabled' }.` );
    } );
}
