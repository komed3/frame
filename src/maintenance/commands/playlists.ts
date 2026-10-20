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

  playlistCommand
    .command( 'get <user> <playlist>' )
    .description( 'Show playlist details' )
    .action( ( user: string, playlist: string ) => {
      const record = Playlists.get( resolveId( user, 'user' ), resolveId( playlist, 'playlist' ) );
      if ( ! record ) throw new Error( `Playlist ${ playlist } does not exist` );
      console.table( [ record ] );
    } );

  playlistCommand
    .command( 'create <user> <name>' )
    .description( 'Create a playlist' )
    .option( '--description <text>', 'Playlist description' )
    .action( ( user: string, name: string, options: { description?: string } ) => {
      const id = Playlists.create( resolveId( user, 'user' ), name, options.description );
      ui.success( `Created playlist ${ name } (ID ${ id }).` );
    } );

  playlistCommand
    .command( 'update <user> <playlist>' )
    .description( 'Update a playlist' )
    .option( '--name <name>', 'New playlist name' )
    .option( '--description <text>', 'New playlist description' )
    .action( ( user: string, playlist: string, options: { name?: string; description?: string } ) => {
      if ( options.name === undefined && options.description === undefined )
        throw new Error( 'Specify --name or --description' );

      Playlists.update( resolveId( user, 'user' ), resolveId( playlist, 'playlist' ), {
        name: options.name, description: options.description
      } );

      ui.success( `Updated playlist ${ playlist }.` );
    } );
}
