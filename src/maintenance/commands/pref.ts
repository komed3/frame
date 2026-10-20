import { ui } from '@/src/maintenance/utils/ui';
import { Pref } from '@/src/server/core/Pref';
import { resolveId } from '@/src/server/utils';
import type { PrefName, PrefValue } from '@/src/shared/types/pref';
import { Command } from 'commander';


const parseValue = ( value: string ) : unknown => {
  try { return JSON.parse( value ) }
  catch { return value }
};


export const registerPrefCommands = ( program: Command ) : void => {
  const prefCommand = program
    .command( 'pref' )
    .description( 'Manage user preferences' );
}
