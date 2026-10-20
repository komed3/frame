import { parseNumber } from '@/src/maintenance/utils/format';
import { ui } from '@/src/maintenance/utils/ui';
import { Plays } from '@/src/server/core/Plays';
import { resolveId } from '@/src/server/utils';
import { Command } from 'commander';


const showPlays = ( records: ReturnType< typeof Plays.listByUser > ) : void => {
  if ( ! records.length ) return ui.info( 'No playback history found.' );
  console.table( records );
};


export const registerPlayCommands = ( program: Command ) : void => {
  const playCommand = program
    .command( 'plays' )
    .description( 'Inspect playback history' );

  playCommand
    .command( 'list-user <user>' )
    .description( 'List playback history for a user' )
    .option( '--limit <number>', 'Maximum number of results', '100' )
    .option( '--offset <number>', 'Skip results', '0' )
    .action( ( user: string, options: { limit: string; offset: string } ) => {
      showPlays( Plays.listByUser(
        resolveId( user, 'user' ), parseNumber( options.limit, 'limit', 1 ),
        parseNumber( options.offset, 'offset' )
      ) );
    } );

  playCommand
    .command( 'list-media <media>' )
    .description( 'List playback history for a media record' )
    .option( '--limit <number>', 'Maximum number of results', '100' )
    .option( '--offset <number>', 'Skip results', '0' )
    .action( ( media: string, options: { limit: string; offset: string } ) => {
      showPlays( Plays.listByMedia(
        resolveId( media, 'media' ), parseNumber( options.limit, 'limit', 1 ),
        parseNumber( options.offset, 'offset' )
      ) );
    } );
}
