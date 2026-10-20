import { parseNumber } from '@/src/maintenance/utils/format';
import { confirm } from '@/src/maintenance/utils/prompt';
import { ui } from '@/src/maintenance/utils/ui';
import { Markers } from '@/src/server/core/Markers';
import { resolveId } from '@/src/server/utils';
import { Command } from 'commander';





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

  markerCommand
    .command( 'get <user> <marker>' )
    .description( 'Show marker details' )
    .action( ( user: string, marker: string ) => {
      const record = Markers.get( resolveId( user, 'user' ), resolveId( marker, 'marker' ) );
      if ( ! record ) throw new Error( `Marker ${ marker } does not exist for user ${ user }` );
      console.table( [ record ] );
    } );

  markerCommand
    .command( 'media-list <user> <media>' )
    .description( 'List markers for one media record' )
    .option( '--limit <number>', 'Maximum number of results', '100' )
    .option( '--offset <number>', 'Skip results', '0' )
    .action( ( user: string, media: string, options: { limit: string; offset: string } ) => {
      const markers = Markers.mediaMarker(
        resolveId( user, 'user' ), resolveId( media, 'media' ),
        parseNumber( options.limit, 'limit', 1 ), parseNumber( options.offset, 'offset' )
      );

      if ( ! markers.length ) return ui.info( 'No markers found for this media.' );
      console.table( markers );
    } );

  markerCommand
    .command( 'create <user> <media> <position-ms>' )
    .description( 'Create a marker' )
    .option( '--title <title>', 'Marker title' )
    .option( '--description <text>', 'Marker description' )
    .action( ( user: string, media: string, position: string, options: {
      title?: string; description?: string
    } ) => {
      const id = Markers.create(
        resolveId( user, 'user' ), resolveId( media, 'media' ),
        parseNumber( position, 'position' ), options.title ?? null,
        options.description ?? null
      );

      ui.success( `Created marker ${ id }.` );
    } );

  markerCommand
    .command( 'update <user> <marker>' )
    .description( 'Update a marker' )
    .option( '--position <ms>', 'New position in milliseconds' )
    .option( '--title <title>', 'New title' )
    .option( '--description <text>', 'New description' )
    .action( ( user: string, marker: string, options: {
      position?: string; title?: string; description?: string
    } ) => {
      if (
        options.position === undefined && options.title === undefined &&
        options.description === undefined
      ) throw new Error( 'Specify --position, --title or --description' );

      Markers.update( resolveId( user, 'user' ), resolveId( marker, 'marker' ), {
        positionMs: options.position === undefined ? undefined : parseNumber( options.position, 'position' ),
        title: options.title, description: options.description
      } );

      ui.success( `Updated marker ${ marker }.` );
    } );

  markerCommand
    .command( 'delete <user> <marker>' )
    .description( 'Delete a marker' )
    .option( '-y, --yes', 'Skip confirmation' )
    .action( async ( user: string, marker: string, options: { yes?: boolean } ) => {
      const userId = resolveId( user, 'user' ), markerId = resolveId( marker, 'marker' );
      if ( ! options.yes && ! await confirm( `Delete marker ${ markerId } for user ${ userId }?` ) )
        return ui.cancelled();

      const deleted = Markers.delete( userId, markerId );
      if ( ! deleted ) return ui.info( 'Marker was not found.' );

      ui.success( `Deleted marker ${ markerId }.` );
    } );

  markerCommand
    .command( 'clear-media <user> <media>' )
    .description( 'Delete all markers for one media record' )
    .option( '-y, --yes', 'Skip confirmation' )
    .action( async ( user: string, media: string, options: { yes?: boolean } ) => {
      const userId = resolveId( user, 'user' ), mediaId = resolveId( media, 'media' );
      if ( ! options.yes && ! await confirm( `Delete all markers for media ${ mediaId } and user ${ userId }?` ) )
        return ui.cancelled();

      const count = Markers.clearMediaMarker( userId, mediaId );
      ui.success( `Deleted ${ count } marker(s).` );
    } );

  markerCommand
    .command( 'clear <user>' )
    .description( 'Delete all markers for a user' )
    .option( '-y, --yes', 'Skip confirmation' )
    .action( async ( user: string, options: { yes?: boolean } ) => {
      const userId = resolveId( user, 'user' );
      if ( ! options.yes && ! await confirm( `Delete all markers for user ${ userId }?` ) )
        return ui.cancelled();

      const count = Markers.clear( userId );
      ui.success( `Deleted ${ count } marker(s).` );
    } );
}
