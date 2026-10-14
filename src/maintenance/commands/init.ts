import { prompt, promptPassword } from '@/src/maintenance/utils/prompt';
import { ui } from '@/src/maintenance/utils/ui';
import { Config } from '@/src/server/core/Config';
import type { ConfigName, ConfigValue } from '@/src/shared/types/config';
import { users } from '@/src/server/core/User';
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
