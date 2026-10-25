import { ui } from '@/src/maintenance/utils/ui';
import { SystemCheck } from '@/src/server/core/SystemCheck';
import { Command } from 'commander';


export const checkSystemRequirements = () : boolean => {
  ui.headline( 'Check system requirements', '[System]' );
  ui.nl();

  const checks = SystemCheck.run();
  let errors = 0;

  for ( const check of checks ) {
    if ( check.warning ) ui.warning( `${ check.name }: ${ check.message }` );
    else if ( check.ok ) ui.success( `${ check.name }: ${ check.message }` );
    else { ui.error( `${ check.name }: ${ check.message }` ); errors++ }
  }

  ui.nl();

  if ( errors ) ui.error( `System check failed: ${ errors } requirement(s) not met.` );
  else ui.success( 'All required system checks passed.' );

  return errors === 0;
};


export const registerCheckCommands = ( program: Command ) : void => {
  program
    .command( 'check' )
    .description( 'Check system requirements for Frame' )
    .action( () => { if ( ! checkSystemRequirements() ) process.exitCode = 1 } );
};
