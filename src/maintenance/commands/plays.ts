import { ui } from '@/src/maintenance/utils/ui';
import { Plays } from '@/src/server/core/Plays';
import { resolveId, validateNumber } from '@/src/server/utils';
import { Command } from 'commander';


const showPlays = ( records: ReturnType< typeof Plays.listByUser > ) : void => {
  if ( ! records.length ) return ui.info( 'No playback history found.' );
  console.table( records );
};
