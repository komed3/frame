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
        type: def.type,
        min: def.type === 'integer' ? def.min : '',
        max: def.type === 'integer' ? def.max : '',
        desc: def.desc
      };
    } ) ) );

  configCommand
    .command( 'get <name>' )
    .description( 'Show a configuration value' )
    .action( ( name: string ) => {
      const key = resolveName( name ), def = Config.schema[ key ];

      console.log( `${ key }=${ JSON.stringify( Config.get( key ) ) }` );
      console.log( def.desc );
    } );

  configCommand
    .command( 'set <name> <value>' )
    .description( 'Set a configuration value' )
    .action( ( name: string, value: string ) => {
      const key = resolveName( name );
      const updated = Config.set( key, Config.validate( key, value ) );

      console.log( `Updated ${ key }=${ JSON.stringify( updated ) }` );
      console.log( 'Restart Frame for changes to take effect.' );
    } );

  configCommand
    .command( 'unset <name>' )
    .description( 'Restore the default value' )
    .action( ( name: string ) => {
      const key = resolveName( name );
      Config.reset( key );

      console.log( `Reset ${ key } to ${ JSON.stringify( Config.get( key ) ) }` );
      console.log( 'Restart Frame for changes to take effect.' );
    } );
}
