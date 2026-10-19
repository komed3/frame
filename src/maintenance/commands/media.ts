import { ui } from '@/src/maintenance/utils/ui';
import { Media, MEDIA_TYPES } from '@/src/server/media/Media';
import { resolveId, validateNumber } from '@/src/server/utils';
import type { MediaType } from '@/src/shared/types/media';
import { Command } from 'commander';


export const registerMediaCommands = ( program: Command ) : void => {
  const mediaCommand = program
    .command( 'media' )
    .description( 'Inspect media records' );
}
