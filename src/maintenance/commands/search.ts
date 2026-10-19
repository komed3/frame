import { ui } from '@/src/maintenance/utils/ui';
import { MediaSearch } from '@/src/server/media/Search';
import type { MediaSearchOptions } from '@/src/shared/types/search';
import { Command } from 'commander';


const parseSearchOptions = ( value: string ) : MediaSearchOptions => {
  let options: unknown;

  try { options = JSON.parse( value ) }
  catch { throw new Error( 'Search options must be valid JSON' ) }

  if ( ! options || typeof options !== 'object' || Array.isArray( options ) )
    throw new Error( 'Search options must be a JSON object' );

  return options as MediaSearchOptions;
};


export const registerSearchCommands = ( program: Command ) : void => {
  program
    .command( 'search [query]' )
    .description( 'Search media records' )
    .option( '--options <json>', 'Search filters as JSON', '{}' )
    .action( ( query: string | undefined, options: { options: string } ) => {
      const filters = parseSearchOptions( options.options );
      const result = MediaSearch.search( { ...filters, query: query === undefined ? filters.query : query } );

      if ( ! result.items.length ) {
        ui.info( 'No media found.' );
        ui.info( `0 results (total: ${ result.total }, offset: ${ result.offset })` );
        return;
      }

      console.table( result.items.map( media => ( {
        id: media.id, type: media.type, title: media.title || media.fileName,
        available: media.available, rootId: media.rootId, directoryId: media.directoryId,
        sizeBytes: media.sizeBytes, durationMs: media.durationMs, path: media.path
      } ) ) );

      ui.info(
        `${ result.items.length } result(s) shown; ${ result.total } total, ` +
        `offset ${ result.offset }, limit ${ result.limit }.`
      );
    } );
};
