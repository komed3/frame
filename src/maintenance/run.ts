#!/usr/bin/env node

import { registerAuthCommands } from '@/src/maintenance/commands/auth';
import { registerUserCommands } from '@/src/maintenance/commands/user';
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


registerUserCommands( frame );
registerAuthCommands( frame );


try { await frame.parseAsync( process.argv ) }
catch ( err ) { console.error( err ), process.exitCode = 1 }
finally { db.close() }
