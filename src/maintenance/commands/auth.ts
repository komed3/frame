import { auth } from '@/src/server/core/Auth';
import { Command } from 'commander';


export const registerAuthCommands = ( program: Command ) : void => {
  const authCommand = program
    .command( 'auth' )
    .description( 'Manage authentication sessions' );
}
