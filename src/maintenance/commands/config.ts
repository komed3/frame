import { ui } from '@/src/maintenance/utils/ui';
import { Config } from '@/src/server/core/Config';
import type { ConfigName } from '@/src/shared/types/config';
import { Command } from 'commander';


const resolveName = ( name: string ) : ConfigName => {
  if ( ! Object.hasOwn( Config.schema, name ) ) throw new Error( `Unknown configuration key: ${ name }` );
  return name as ConfigName;
};


export const registerConfigCommands = ( program: Command ) : void => {
  const configCommand = program
    .command( 'config' )
    .description( 'Manage environment configuration' );

  configCommand
    .command( 'list' )
    .description( 'List configuration values' )
    .action( () => console.table( Object.keys( Config.schema ).map( name => {
      const key = resolveName( name ), def = Config.schema[ key ];

      return {
        name: key, value: Config.get( key ), default: def.default,
        type: def.type, description: def.desc,
        min: def.type === 'integer' ? def.min : '',
        max: def.type === 'integer' ? def.max : ''
      };
    } ) ) );

  configCommand
    .command( 'get <name>' )
    .description( 'Show a configuration value' )
    .action( ( name: string ) => {
      const key = resolveName( name ), def = Config.schema[ key ];

      ui.info( def.desc );
      console.log( `${ ui.key( key ) }=${ ui.value( JSON.stringify( Config.get( key ) ) ) }` );
    } );

  configCommand
    .command( 'set <name> <value>' )
    .description( 'Set a configuration value' )
    .action( ( name: string, value: string ) => {
      const key = resolveName( name );
      const updated = Config.set( key, Config.validate( key, value ) );

      ui.success( `Updated ${ key }=${ JSON.stringify( updated ) }` );
      ui.warning( 'Restart Frame for changes to take effect.' );
    } );

  configCommand
    .command( 'unset <name>' )
    .description( 'Restore the default value' )
    .action( ( name: string ) => {
      const key = resolveName( name );
      Config.reset( key );

      ui.success( `Reset ${ key } to ${ JSON.stringify( Config.get( key ) ) }` );
      ui.warning( 'Restart Frame for changes to take effect.' );
    } );
};
