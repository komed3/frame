import { confirm } from '@/src/maintenance/utils/prompt';
import { ui } from '@/src/maintenance/utils/ui';
import { MediaTaxonomy } from '@/src/server/media/Taxonomy';
import { resolveId } from '@/src/server/utils';
import { Command } from 'commander';


export const registerCategoryCommands = ( program: Command ) : void => {
  const categoryCommand = program
    .command( 'category' ).alias( 'categories' )
    .description( 'Manage categories and media assignments' );

  categoryCommand
    .command( 'list' )
    .description( 'List all categories' )
    .action( () => {
      const categories = MediaTaxonomy.listCategories();
      if ( ! categories.length ) return ui.info( 'No categories found.' );
      console.table( categories );
    } );

  categoryCommand
    .command( 'get <id>' )
    .description( 'Show category details' )
    .action( ( id: string ) => {
      const category = MediaTaxonomy.getCategory( resolveId( id, 'category' ) );
      if ( ! category ) throw new Error( `Category ${ id } does not exist` );
      console.table( [ category ] );
    } );

  categoryCommand
    .command( 'create <name>' )
    .description( 'Create a category or return the existing category ID' )
    .option( '--parent <id>', 'Parent category ID' )
    .action( ( name: string, options: { parent?: string } ) => {
      const id = MediaTaxonomy.createCategory( name, options.parent === undefined ? null
        : resolveId( options.parent, 'parent category' ) );

      ui.success( `Saved category ${ name } (ID ${ id }).` );
    } );

  categoryCommand
    .command( 'rename <id> <name>' )
    .description( 'Rename a category' )
    .action( ( id: string, name: string ) => {
      MediaTaxonomy.renameCategory( resolveId( id, 'category' ), name );
      ui.success( `Renamed category ${ id } to ${ name }.` );
    } );
}
