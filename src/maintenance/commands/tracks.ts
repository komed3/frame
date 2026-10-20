import { ui } from '@/src/maintenance/utils/ui';
import { MediaTracks } from '@/src/server/media/Tracks';
import { resolveId } from '@/src/server/utils';
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
}
