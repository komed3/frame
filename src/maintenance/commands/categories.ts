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

  categoryCommand
    .command( 'set-parent <id> [parent]' )
    .description( 'Set a parent category or make the category a root' )
    .action( ( id: string, parent?: string ) => {
      MediaTaxonomy.setCategoryParent( resolveId( id, 'category' ),
        parent === undefined ? null : resolveId( parent, 'parent category' )
      );

      ui.success( `Updated parent for category ${ id }.` );
    } );

  categoryCommand
    .command( 'delete <id>' )
    .description( 'Delete a category and its media assignments' )
    .option( '-y, --yes', 'Skip confirmation' )
    .action( async ( id: string, options: { yes?: boolean } ) => {
      const categoryId = resolveId( id, 'category' ), category = MediaTaxonomy.getCategory( categoryId );
      if ( ! category ) throw new Error( `Category ${ categoryId } does not exist` );

      if ( ! options.yes && ! await confirm( `Delete category "${ category.name }" and its assignments?` ) )
        return ui.cancelled();

      MediaTaxonomy.deleteCategory( categoryId );
      ui.success( `Deleted category ${ category.name } (ID ${ categoryId }).` );
    } );

  categoryCommand
    .command( 'media-list <media>' )
    .description( 'List categories assigned to a media record' )
    .action( ( media: string ) => {
      const categories = MediaTaxonomy.getMediaCategories( resolveId( media, 'media' ) );
      if ( ! categories.length ) return ui.info( 'No categories assigned.' );
      console.table( categories );
    } );

  categoryCommand
    .command( 'media-set <media> [categories...]' )
    .description( 'Replace category assignments for a media record' )
    .action( ( media: string, categories: string[] = [] ) => {
      MediaTaxonomy.setMediaCategories( resolveId( media, 'media' ),
        categories.map( id => resolveId( id, 'category' ) ) );

      ui.success( `Updated category assignments for media ${ media }.` );
    } );
}
