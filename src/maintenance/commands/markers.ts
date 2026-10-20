import { confirm } from '@/src/maintenance/utils/prompt';
import { ui } from '@/src/maintenance/utils/ui';
import { Markers } from '@/src/server/core/Markers';
import { resolveId, validateNumber } from '@/src/server/utils';
import { Command } from 'commander';


const parseNumber = ( value: string, label: string, min = 0 ) : number =>
  validateNumber( value, label, min, Number.MAX_SAFE_INTEGER, true, true );


export const registerMarkerCommands = ( program: Command ) : void => {
  const markerCommand = program
    .command( 'marker' )
    .alias( 'markers' )
    .description( 'Manage user markers' );

  markerCommand
    .command( 'list <user>' )
    .description( 'List markers for a user' )
    .option( '--limit <number>', 'Maximum number of results', '100' )
    .option( '--offset <number>', 'Skip results', '0' )
    .action( ( user: string, options: { limit: string; offset: string } ) => {
      const markers = Markers.list(
        resolveId( user, 'user' ), parseNumber( options.limit, 'limit', 1 ),
        parseNumber( options.offset, 'offset' )
      );

      if ( ! markers.length ) return ui.info( 'No markers found.' );
      console.table( markers );
    } );
}
