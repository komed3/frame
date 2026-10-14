import { Config } from '@/src/server/core/Config';
import type { ConfigName } from '@/src/shared/types/config';
import { Command } from 'commander';


const resolveName = ( name: string ) : ConfigName => {
  if ( ! Object.hasOwn( Config.schema, name ) ) throw new Error( `Unknown configuration key: ${ name }` );
  return name as ConfigName;
};


export const registerEnvCommands = ( program: Command ) : void => {
  const envCommand = program
    .command( 'env' )
    .description( 'Manage environment configuration' );
}
