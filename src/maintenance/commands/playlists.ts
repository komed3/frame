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
        resolveId( user, 'user' ), parseNumber( options.limit, 'limit', 1 ),
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

  playlistCommand
    .command( 'delete <user> <playlist>' )
    .description( 'Delete a playlist and its entries' )
    .option( '-y, --yes', 'Skip confirmation' )
    .action( async ( user: string, playlist: string, options: { yes?: boolean } ) => {
      const userId = resolveId( user, 'user' ), playlistId = resolveId( playlist, 'playlist' );
      if ( ! options.yes && ! await confirm( `Delete playlist ${ playlistId } for user ${ userId }?` ) )
        return ui.cancelled();

      Playlists.delete( userId, playlistId );
      ui.success( `Deleted playlist ${ playlistId }.` );
    } );

  playlistCommand
    .command( 'items <user> <playlist>' )
    .description( 'List entries in a playlist' )
    .option( '--limit <number>', 'Maximum number of results', '100' )
    .option( '--offset <number>', 'Skip results', '0' )
    .action( ( user: string, playlist: string, options: { limit: string; offset: string } ) => {
      const items = Playlists.listItems(
        resolveId( user, 'user' ), resolveId( playlist, 'playlist' ),
        parseNumber( options.limit, 'limit', 1 ), parseNumber( options.offset, 'offset' )
      );

      if ( ! items.length ) return ui.info( 'No playlist entries found.' );
      console.table( items );
    } );

  playlistCommand
    .command( 'add <user> <playlist> <media>' )
    .description( 'Add a media record to a playlist' )
    .action( ( user: string, playlist: string, media: string ) => {
      Playlists.addItem(
        resolveId( user, 'user' ), resolveId( playlist, 'playlist' ),
        resolveId( media, 'media' )
      );

      ui.success( `Added media ${ media } to playlist ${ playlist }.` );
    } );

  playlistCommand
    .command( 'remove <user> <playlist> <media>' )
    .description( 'Remove a media record from a playlist' )
    .action( ( user: string, playlist: string, media: string ) => {
      const removed = Playlists.removeItem(
        resolveId( user, 'user' ), resolveId( playlist, 'playlist' ),
        resolveId( media, 'media' )
      );

      if ( ! removed ) return ui.info( 'Media was not in the playlist.' );
      ui.success( `Removed media ${ media } from playlist ${ playlist }.` );
    } );

  playlistCommand
    .command( 'move <user> <playlist> <media> <position>' )
    .description( 'Move a playlist entry to a zero-based position' )
    .action( ( user: string, playlist: string, media: string, position: string ) => {
      Playlists.moveItem(
        resolveId( user, 'user' ), resolveId( playlist, 'playlist' ),
        resolveId( media, 'media' ), parseNumber( position, 'position' )
      );

      ui.success( `Moved media ${ media } in playlist ${ playlist }.` );
    } );

  playlistCommand
    .command( 'clear <user> <playlist>' )
    .description( 'Remove all entries from a playlist' )
    .option( '-y, --yes', 'Skip confirmation' )
    .action( async ( user: string, playlist: string, options: { yes?: boolean } ) => {
      const userId = resolveId( user, 'user' ), playlistId = resolveId( playlist, 'playlist' );
      if ( ! options.yes && ! await confirm( `Remove all entries from playlist ${ playlistId }?` ) )
        return ui.cancelled();

      const count = Playlists.clearItems( userId, playlistId );
      ui.success( `Removed ${ count } playlist entr(y/ies).` );
    } );
}
