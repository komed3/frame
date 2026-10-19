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
