import { prompt, promptConfirmedPassword } from '@/src/maintenance/utils/prompt';
import { ui } from '@/src/maintenance/utils/ui';
import { Config } from '@/src/server/core/Config';
import { User } from '@/src/server/core/User';
import type { ConfigName, ConfigValue } from '@/src/shared/types/config';
import { Command } from 'commander';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';


const configure = async () : Promise< void > => {
  ui.headline( 'Configure Frame', '[1/2]' );

  for ( const key of Object.keys( Config.schema ) as ConfigName[] ) {
    const def = Config.schema[ key ], cur = String( Config.get( key ) );
    let details = def.desc;

    if ( def.type === 'enum' && def.values ) details += `\nAllowed values: ${ def.values.join( ', ' ) }`;
    if ( def.type === 'integer' || def.type === 'number' ) details += `\nRange: ${ def.min }–${ def.max }`;

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
  const activeAdmin = User.list().find( user => user.isAdmin && ! user.disabledAt );
  if ( activeAdmin ) return ui.info( `An active administrator already exists: ${ activeAdmin.username }` );

  ui.nl();
  ui.headline( 'Create administrator account', '[2/2]' );
  ui.nl();

  let username = await prompt( 'Administrator username:', 'admin' );

  while ( true ) {
    try {
      username = User.validateUsername( username );
      if ( User.getByUsername( username ) ) throw new Error( 'Username is already taken' );
      break;
    } catch ( err ) {
      ui.error( err instanceof Error ? err.message : String( err ) );
      username = await prompt( 'Administrator username:', username );
    }
  }

  const pw = await promptConfirmedPassword( pw => User.validatePassword( pw ) );
  const admin = await User.create( username, pw, true );

  ui.nl();
  ui.success( `Administrator ${ admin.username } created (ID ${ admin.id }).` );
};


export const registerInitCommands = ( program: Command ) : void => {
  program
    .command( 'init' )
    .description( 'Initialize Frame' )
    .action( async () => {
      if ( existsSync( resolve( '.env' ) ) )
        throw new Error( 'Frame has already been initialized (.env already exists).' );

      ui.info( ui.key( 'Welcome to Frame' ) );
      ui.info( 'This command will guide you through the initial configuration of Frame.' );
      ui.info( 'Press Enter to accept the displayed default value.' );
      ui.nl();

      await configure();
      await createAdmin();

      ui.nl();
      ui.info( 'Frame initialization complete.' );
      ui.info( 'Start Frame and have fun watching your videos!' );
      ui.info( `Run ${ ui.value( 'npm run start' ) } to start server.` );
    } );
};
