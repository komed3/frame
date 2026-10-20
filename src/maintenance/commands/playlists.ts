import { confirm } from '@/src/maintenance/utils/prompt';
import { ui } from '@/src/maintenance/utils/ui';
import { Playlists } from '@/src/server/core/Playlists';
import { resolveId, validateNumber } from '@/src/server/utils';
import { Command } from 'commander';


const parseNumber = ( value: string, label: string, min = 0 ) : number =>
  validateNumber( value, label, min, Number.MAX_SAFE_INTEGER, true, true );


export const registerPlaylistCommands = ( program: Command ) : void => {
  const playlistCommand = program
    .command( 'playlist' )
    .description( 'Manage user playlists' );

  playlistCommand
    .command( 'list <user>' )
    .description( 'List playlists for a user' )
    .option( '--limit <number>', 'Maximum number of results', '100' )
    .option( '--offset <number>', 'Skip results', '0' )
    .action( ( user: string, options: { limit: string; offset: string } ) => {
      const playlists = Playlists.list(
        resolveId( user, 'user' ),
        parseNumber( options.limit, 'limit', 1 ),
        parseNumber( options.offset, 'offset' )
      );

      if ( ! playlists.length ) return ui.info( 'No playlists found.' );
      console.table( playlists );
    } );
}
