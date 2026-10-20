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

  favoriteCommand
    .command( 'add <user> <media>' )
    .description( 'Add a media record to favorites' )
    .action( ( user: string, media: string ) => {
      const added = Favorites.add( resolveId( user, 'user' ), resolveId( media, 'media' ) );
      ui.info( added ? 'Favorite added.' : 'Media is already a favorite.' );
    } );

  favoriteCommand
    .command( 'remove <user> <media>' )
    .description( 'Remove a media record from favorites' )
    .action( ( user: string, media: string ) => {
      const removed = Favorites.remove( resolveId( user, 'user' ), resolveId( media, 'media' ) );
      ui.info( removed ? 'Favorite removed.' : 'Media was not a favorite.' );
    } );

  favoriteCommand
    .command( 'clear <user>' )
    .description( 'Remove all favorites for a user' )
    .option( '-y, --yes', 'Skip confirmation' )
    .action( async ( user: string, options: { yes?: boolean } ) => {
      const userId = resolveId( user, 'user' );

      if ( ! options.yes && ! await confirm( `Remove all favorites for user ${ userId }?` ) )
        return ui.cancelled();

      const count = Favorites.clear( userId );
      ui.success( `Removed ${ count } favorite(s) for user ${ userId }.` );
    } );
}
