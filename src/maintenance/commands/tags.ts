import { confirm } from '@/src/maintenance/utils/prompt';
import { ui } from '@/src/maintenance/utils/ui';
import { MediaTaxonomy } from '@/src/server/media/Taxonomy';
import { resolveId } from '@/src/server/utils';
import { Command } from 'commander';


export const registerTagCommands = ( program: Command ) : void => {
  const tagCommand = program
    .command( 'tag' ).alias( 'tags' )
    .description( 'Manage tags and media assignments' );
}
