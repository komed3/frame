import { confirm } from '@/src/maintenance/utils/prompt';
import { ui } from '@/src/maintenance/utils/ui';
import { Favorites } from '@/src/server/core/Favorites';
import { resolveId, validateNumber } from '@/src/server/utils';
import { Command } from 'commander';


const parseNumber = ( value: string, label: string, min = 0 ) : number =>
  validateNumber( value, label, min, Number.MAX_SAFE_INTEGER, true, true );


export const registerFavoriteCommands = ( program: Command ) : void => {
  const favoriteCommand = program
    .command( 'favorite' )
    .alias( 'favorites' )
    .description( 'Manage user favorites' );

  favoriteCommand
    .command( 'list <user>' )
    .description( 'List favorites for a user' )
    .option( '--limit <number>', 'Maximum number of results', '100' )
    .option( '--offset <number>', 'Skip results', '0' )
    .action( ( user: string, options: { limit: string; offset: string } ) => {
      const favorites = Favorites.list(
        resolveId( user, 'user' ), parseNumber( options.limit, 'limit', 1 ),
        parseNumber( options.offset, 'offset' )
      );

      if ( ! favorites.length ) return ui.info( 'No favorites found.' );
      console.table( favorites );
    } );
}
