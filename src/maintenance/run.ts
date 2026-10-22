#!/usr/bin/env node

import { registerAssetCommands } from '@/src/maintenance/commands/assets';
import { registerAuthCommands } from '@/src/maintenance/commands/auth';
import { registerCategoryCommands } from '@/src/maintenance/commands/categories';
import { registerConfigCommands } from '@/src/maintenance/commands/config';
import { registerDbCommands } from '@/src/maintenance/commands/db';
import { registerDirectoryCommands } from '@/src/maintenance/commands/directories';
import { registerFavoriteCommands } from '@/src/maintenance/commands/favorites';
import { registerInitCommands } from '@/src/maintenance/commands/init';
import { registerJobCommands } from '@/src/maintenance/commands/job';
import { registerMarkerCommands } from '@/src/maintenance/commands/markers';
import { registerMediaCommands } from '@/src/maintenance/commands/media';
import { registerMetadataCommands } from '@/src/maintenance/commands/metadata';
import { registerPlaylistCommands } from '@/src/maintenance/commands/playlists';
import { registerPlayCommands } from '@/src/maintenance/commands/plays';
import { registerPrefCommands } from '@/src/maintenance/commands/pref';
import { registerRootCommands } from '@/src/maintenance/commands/roots';
import { registerScanCommands } from '@/src/maintenance/commands/scan';
import { registerSearchCommands } from '@/src/maintenance/commands/search';
import { registerTagCommands } from '@/src/maintenance/commands/tags';
import { registerTrackCommands } from '@/src/maintenance/commands/tracks';
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


frame.commandsGroup( 'Configuration:' );
registerInitCommands( frame );
registerConfigCommands( frame );
registerDbCommands( frame );

frame.commandsGroup( 'Users & Accounts:' );
registerUserCommands( frame );
registerAuthCommands( frame );
registerPrefCommands( frame );

frame.commandsGroup( 'Media:' );
registerSearchCommands( frame );
registerRootCommands( frame );
registerDirectoryCommands( frame );
registerMediaCommands( frame );
registerMetadataCommands( frame );
registerTrackCommands( frame );
registerAssetCommands( frame );

frame.commandsGroup( 'Taxonomies:' );
registerCategoryCommands( frame );
registerTagCommands( frame );

frame.commandsGroup( 'User Data:' );
registerPlaylistCommands( frame );
registerFavoriteCommands( frame );
registerMarkerCommands( frame );
registerPlayCommands( frame );

frame.commandsGroup( 'Background Jobs:' );
registerJobCommands( frame );
registerScanCommands( frame );


try { await frame.parseAsync( process.argv ) }
catch ( err ) {
  ui.error( err instanceof Error ? err.message : String( err ) );
  process.exitCode = 1;
}
finally { db.close() }
