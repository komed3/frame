import { Command } from 'commander';
import { closeDatabase, db } from '@/src/server/db';
import { enqueueJob } from '@/src/server/jobs/queue';
import { mediaRoots } from '@/src/server/media/roots';


const cli = new Command();

cli
  .name( 'frame' )
  .description( 'Frame media library maintenance' )
  .version( '2.0.0' );
