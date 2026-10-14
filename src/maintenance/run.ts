#!/usr/bin/env node

import { Command } from 'commander';


const frame = new Command();

frame
  .name( 'frame' )
  .version( 'Frame 2.0.0' )
  .description(
    'Frame, the private self-hosted video management platform.\n' +
    'Copyright (c) 2026 komed3. MIT license.' +
    'Maintenance script.'
  );
