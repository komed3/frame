import { parseJSON } from '@/src/maintenance/utils/parse';
import { confirm } from '@/src/maintenance/utils/prompt';
import { ui } from '@/src/maintenance/utils/ui';
import { Pref } from '@/src/server/core/Pref';
import { resolveId } from '@/src/server/utils';
import type { PrefName, PrefValue } from '@/src/shared/types/pref';
import { Command } from 'commander';


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

  prefCommand
    .command( 'set <user> <key> <value>' )
    .description( 'Set a preference' )
    .action( ( user: string, name: string, rawValue: string ) => {
      const userId = resolveId( user, 'user' );
      const key = Pref.resolveName( name );
      const value = parseJSON( rawValue );

      Pref.set( userId, key, value as PrefValue< typeof key > );
      ui.success( `Updated ${ key } for user ${ userId }.` );
    } );

  prefCommand
    .command( 'reset <user> <key>' )
    .description( 'Reset one preference to its default' )
    .action( ( user: string, name: string ) => {
      const userId = resolveId( user, 'user' );
      const key = Pref.resolveName( name );

      Pref.reset( userId, key );
      ui.success( `Reset ${ key } to its default for user ${ userId }.` );
    } );

  prefCommand
    .command( 'reset-all <user>' )
    .description( 'Reset all preferences for a user' )
    .option( '-y, --yes', 'Skip confirmation' )
    .action( async ( user: string, options: { yes?: boolean } ) => {
      const userId = resolveId( user, 'user' );

      if ( ! options.yes && ! await confirm( `Reset all preferences for user ${ userId }?` ) )
        return ui.cancelled();

      const count = Pref.resetAll( userId );
      ui.success( `Reset ${ count } preference(s) for user ${ userId }.` );
    } );
}
