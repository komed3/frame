import { parseNumber, resolveId } from '@/src/maintenance/utils/parse';
import { ui } from '@/src/maintenance/utils/ui';
import { MediaTracks } from '@/src/server/media/Tracks';
import { Command } from 'commander';


export const registerTrackCommands = ( program: Command ) : void => {
  const trackCommand = program
    .command( 'track' )
    .alias( 'tracks' )
    .description( 'Inspect media tracks' );

  trackCommand
    .command( 'list <media>' )
    .description( 'List tracks for a media record' )
    .action( ( media: string ) => {
      const tracks = MediaTracks.list( resolveId( media, 'media' ) );
      if ( ! tracks.length ) return ui.info( 'No tracks found.' );
      console.table( tracks );
    } );

  trackCommand
    .command( 'get <media> <stream-index>' )
    .description( 'Show one track by stream index' )
    .action( ( media: string, streamIndex: string ) => {
      const index = parseNumber( streamIndex, 'stream index' );
      const track = MediaTracks.get( resolveId( media, 'media' ), index );
      if ( ! track ) throw new Error( `Track with stream index ${ index } does not exist` );

      for ( const [ key, v ] of Object.entries( track ) )
        console.log( `${ ui.key( key ) }: ${ ui.value(
          v === null ? '—' : typeof v === 'object' ? JSON.stringify( v ) : String( v )
        ) }` );
    } );
}
