import { parseNumber, parseValue } from '@/src/maintenance/utils/parse';
import { confirm } from '@/src/maintenance/utils/prompt';
import { ui } from '@/src/maintenance/utils/ui';
import { Media, MEDIA_TYPES } from '@/src/server/media/Media';
import { resolveId } from '@/src/server/utils';
import type { MediaType } from '@/src/shared/types/media';
import { Command } from 'commander';


export const registerMediaCommands = ( program: Command ) : void => {
  const mediaCommand = program
    .command( 'media' )
    .description( 'Inspect media records' );

  mediaCommand
    .command( 'list' )
    .description( 'List media records' )
    .option( '--root <id>', 'Filter by media root' )
    .option( '--directory <id>', 'Filter by media directory' )
    .option( '--type <type>', 'Filter by media type' )
    .option( '--available', 'Show only available media' )
    .option( '--limit <number>', 'Maximum number of results', '100' )
    .option( '--offset <number>', 'Skip results', '0' )
    .action( ( options: {
      root?: string, directory?: string, type?: string, available?: boolean,
      limit: string, offset: string
    } ) => {
      const type = options.type === undefined ? undefined : options.type as MediaType;
      if ( type !== undefined && ! MEDIA_TYPES.includes( type ) )
        throw new Error( `Invalid media type: ${ options.type }` );

      const media = Media.list( {
        rootId: options.root === undefined ? undefined : resolveId( options.root, 'media root' ),
        directoryId: options.directory === undefined ? undefined : resolveId( options.directory, 'media directory' ),
        type, availableOnly: !! options.available,
        limit: parseNumber( options.limit, 'limit', 1 ),
        offset: parseNumber( options.offset, 'offset' )
      } );

      if ( ! media.length ) return ui.info( 'No media found.' );

      console.table( media.map( item => ( {
        id: item.id, type: item.type, title: item.title || item.fileName,
        available: item.available, rootId: item.rootId, directoryId: item.directoryId,
        sizeBytes: item.sizeBytes, durationMs: item.durationMs, path: item.path
      } ) ) );
    } );

  mediaCommand
    .command( 'get <id-or-root> [path]' )
    .description( 'Show media details by ID or root ID and relative path' )
    .action( ( idOrRoot: string, path?: string ) => {
      const media = path === undefined ? Media.get( resolveId( idOrRoot, 'media' ) )
        : Media.getByPath( resolveId( idOrRoot, 'media root' ), path );

      if ( ! media ) throw new Error( path === undefined ? `Media ${ idOrRoot } does not exist`
        : `No media found at ${ path } in root ${ idOrRoot }` );

      for ( const [ key, value ] of Object.entries( media ) )
        console.log( `${ ui.key( key ) }: ${ ui.value( parseValue( value ) ) }` );
    } );

  mediaCommand
    .command( 'clean' )
    .description( 'Delete unavailable media records' )
    .option( '-y, --yes', 'Skip confirmation' )
    .action( async ( options: { yes?: boolean } ) => {
      ui.warning( 'This will permanently delete all unavailable media records.' );
      ui.warning( 'Related database records will be deleted as well.' );
      ui.nl();

      if ( ! options.yes && ! await confirm( 'Continue?' ) ) return ui.cancelled();
      const count = Media.deleteUnavailable();

      ui.success( `Deleted ${ count } unavailable media record(s).` );
      if ( count ) ui.warning( `Related physical assets have NOT been deleted. Please run ${
        ui.value( 'frame assets clean' )
      }` );
    } );
}
