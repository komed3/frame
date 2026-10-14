import { prompt, promptPassword } from '@/src/maintenance/utils/prompt';
import { ui } from '@/src/maintenance/utils/ui';
import { Config } from '@/src/server/core/Config';
import { users } from '@/src/server/core/User';
import type { ConfigName, ConfigValue } from '@/src/shared/types/config';
import { Command } from 'commander';


const configure = async () : Promise< void > => {
  ui.headline( 'Configure Frame', '[1/2]' );
  ui.info( 'Press Enter to accept the displayed default value.' );
  ui.nl();

  for ( const key of Object.keys( Config.schema ) as ConfigName[] ) {
    const def = Config.schema[ key ], cur = String( Config.get( key ) );
    let details = def.desc;

    if ( def.type === 'enum' && def.values ) details += `\nAllowed values: ${ def.values.join( ', ' ) }`;
    if ( def.type === 'integer' ) details += `\nRange: ${ def.min }–${ def.max }`;

    let saved = false;

    while ( ! saved ) {
      ui.info( `\n${ ui.key( key ) }\n${ details }` );
      const answer = await prompt( 'Value:', cur );

      try {
        const value = Config.validate( key, answer );
        Config.set( key, value as ConfigValue< typeof key > );

        ui.success( `${ key } configured.` );
        saved = true;
      } catch ( err ) {
        ui.error( err instanceof Error ? err.message : String( err ) );
      }
    }
  }
};

const createAdmin = async () : Promise< void > => {
  const activeAdmin = users.list().find( user => user.isAdmin && ! user.disabledAt );
  if ( activeAdmin ) return ui.info( `An active administrator already exists: ${ activeAdmin.username }` );

  ui.headline( 'Create administrator account', '[2/2]' );
  ui.nl();

  let username = await prompt( 'Administrator username:', 'admin' );

  while ( true ) {
    const pw = await promptPassword( 'Password: ' );
    const conf = await promptPassword( 'Confirm password: ' );

    if ( pw !== conf ) {
      ui.error( 'Passwords do not match.' );
      continue;
    }

    try {
      const admin = await users.create( username, pw, true );
      ui.success( `Administrator ${ admin.username } created (ID ${ admin.id }).` );
      return;
    } catch ( err ) {
      const message = err instanceof Error ? err.message : String( err );
      if ( ! message.startsWith( 'Username' ) && ! message.startsWith( 'Password' ) ) throw err;

      ui.error( message );

      if ( message.startsWith( 'Username' ) ) username = await prompt( 'Administrator username:', username );
    }
  }
};


export const registerInitCommands = ( program: Command ) : void => {
  program
    .command( 'init' )
    .description( 'Initialize Frame' )
    .action( async () => {
      ui.info( 'Welcome to Frame' );
      ui.info( 'This command will guide you through the initial configuration of Frame.' );
      ui.nl();

      await configure();
      await createAdmin();

      ui.nl();
      ui.info( 'Frame initialization complete.' );
      ui.info( 'Start Frame and have fun watching your videos!' );
    } );
};
