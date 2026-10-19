#!/usr/bin/env node

import { registerAuthCommands } from '@/src/maintenance/commands/auth';
import { registerConfigCommands } from '@/src/maintenance/commands/config';
import { registerDbCommands } from '@/src/maintenance/commands/db';
import { registerDirectoryCommands } from '@/src/maintenance/commands/directories';
import { registerInitCommands } from '@/src/maintenance/commands/init';
import { registerRootCommands } from '@/src/maintenance/commands/roots';
import { registerUserCommands } from '@/src/maintenance/commands/user';
import { ui } from '@/src/maintenance/utils/ui';
import { db } from '@/src/server/core/Database';
import { Command } from 'commander';


const frame = new Command();

frame
  .name( 'frame' )
  .version( 'Frame 2.0.0' )
  .description(
    'Frame, the private self-hosted video management platform.\n' +
    'Copyright (c) 2026 komed3. MIT license.\n\n' +
    'Maintenance script.'
  );


registerInitCommands( frame );
registerConfigCommands( frame );
registerDbCommands( frame );

registerUserCommands( frame );
registerAuthCommands( frame );

registerRootCommands( frame );
registerDirectoryCommands( frame );


try { await frame.parseAsync( process.argv ) }
catch ( err ) {
  ui.error( err instanceof Error ? err.message : String( err ) );
  process.exitCode = 1;
}
finally { db.close() }
