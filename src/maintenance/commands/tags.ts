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

  tagCommand
    .command( 'create <name>' )
    .description( 'Create a tag or return the existing tag ID' )
    .action( ( name: string ) => {
      const id = MediaTaxonomy.createTag( name );
      ui.success( `Saved tag ${ name } (ID ${ id }).` );
    } );

  tagCommand
    .command( 'rename <id> <name>' )
    .description( 'Rename a tag' )
    .action( ( id: string, name: string ) => {
      MediaTaxonomy.renameTag( resolveId( id, 'tag' ), name );
      ui.success( `Renamed tag ${ id } to ${ name }.` );
    } );

  tagCommand
    .command( 'delete <id>' )
    .description( 'Delete a tag and its media assignments' )
    .option( '-y, --yes', 'Skip confirmation' )
    .action( async ( id: string, options: { yes?: boolean } ) => {
      const tagId = resolveId( id, 'tag' ), tag = MediaTaxonomy.getTag( tagId );
      if ( ! tag ) throw new Error( `Tag ${ tagId } does not exist` );

      if ( ! options.yes && ! await confirm( `Delete tag "${ tag.name }" and its assignments?` ) )
        return ui.cancelled();

      MediaTaxonomy.deleteTag( tagId );
      ui.success( `Deleted tag ${ tag.name } (ID ${ tagId }).` );
    } );

  tagCommand
    .command( 'media-list <media>' )
    .description( 'List tags assigned to a media record' )
    .action( ( media: string ) => {
      const tags = MediaTaxonomy.getMediaTags( resolveId( media, 'media' ) );
      if ( ! tags.length ) return ui.info( 'No tags assigned.' );
      console.table( tags );
    } );
}
