import { confirm } from '@/src/maintenance/utils/prompt';
import { ui } from '@/src/maintenance/utils/ui';
import { MediaTaxonomy } from '@/src/server/media/Taxonomy';
import { resolveId } from '@/src/server/utils';
import { Command } from 'commander';


export const registerCategoryCommands = ( program: Command ) : void => {
  const categoryCommand = program
    .command( 'category' ).alias( 'categories' )
    .description( 'Manage categories and media assignments' );
}
