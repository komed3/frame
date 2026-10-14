#!/usr/bin/env node

import { Command } from 'commander';


const frame = new Command();

frame
  .name( 'frame' )
  .description( 'Frame, the private self-hosted video management platform.\nMaintenance script.' )
  .version( 'Frame 2.0.0', '-v, --version', 'Output the version number' );
