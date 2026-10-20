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

  prefCommand
    .command( 'list <user>' )
    .description( 'List all preferences and their current values' )
    .action( ( user: string ) => {
      const userId = resolveId( user, 'user' );
      const values = Pref.all( userId );

      console.table( Object.entries( Pref.schema ).map( ( [ name, definition ] ) => ( {
        key: name, value: values[ name as PrefName ], type: definition.type,
        default: definition.default, description: definition.desc
      } ) ) );
    } );

  prefCommand
    .command( 'get <user> <key>' )
    .description( 'Get one preference' )
    .action( ( user: string, name: string ) => {
      const key = Pref.resolveName( name ), value = Pref.get( resolveId( user, 'user' ), key );
      ui.info( `${ ui.key( key ) }: ${ ui.value( JSON.stringify( value ) ) }` );
    } );
}
