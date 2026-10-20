import { ui } from '@/src/maintenance/utils/ui';
import { MediaTracks } from '@/src/server/media/Tracks';
import { resolveId } from '@/src/server/utils';
import { Command } from 'commander';


export const registerTrackCommands = ( program: Command ) : void => {
  const trackCommand = program
    .command( 'track' )
    .alias( 'tracks' )
    .description( 'Inspect media tracks' );
}
