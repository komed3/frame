import { confirm } from '@/src/maintenance/utils/prompt';
import { ui } from '@/src/maintenance/utils/ui';
import { MediaTaxonomy } from '@/src/server/media/Taxonomy';
import { resolveId } from '@/src/server/utils';
import { Command } from 'commander';


export const registerTagCommands = ( program: Command ) : void => {
  const tagCommand = program
    .command( 'tag' ).alias( 'tags' )
    .description( 'Manage tags and media assignments' );

  tagCommand
    .command( 'list' )
    .description( 'List all tags' )
    .action( () => {
      const tags = MediaTaxonomy.listTags();
      if ( ! tags.length ) return ui.info( 'No tags found.' );
      console.table( tags );
    } );

  tagCommand
    .command( 'get <id>' )
    .description( 'Show tag details' )
    .action( ( id: string ) => {
      const tag = MediaTaxonomy.getTag( resolveId( id, 'tag' ) );
      if ( ! tag ) throw new Error( `Tag ${ id } does not exist` );
      console.table( [ tag ] );
    } );
}
