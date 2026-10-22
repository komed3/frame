import { SystemCheck } from '@/src/server/core/SystemCheck';
import { Command } from 'commander';


export const registerCheckCommands = ( program: Command ) : void => {
  program
    .command( 'check' )
    .description( 'Check system requirements for Frame' )
    .action( () => { if ( ! SystemCheck.run() ) process.exitCode = 1 } );
};
