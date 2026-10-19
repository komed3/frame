import { ui } from '@/src/maintenance/utils/ui';
import { Media, MEDIA_TYPES } from '@/src/server/media/Media';
import { resolveId, validateNumber } from '@/src/server/utils';
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
}
