import { Command } from 'commander';
import { closeDatabase, db } from '@/src/server/db';
import { enqueueJob } from '@/src/server/jobs/queue';
import { mediaRoots } from '@/src/server/media/roots';


const cli = new Command();
cli.name( 'frame' ).description( 'Frame media library maintenance' ).version( '2.0.0' );


// --- media roots ---

const roots = cli.command( 'roots' ).description( 'Manage media roots' );

roots.command( 'add <path>' ).description( 'Register a media directory' )
  .action( ( path: string ) => console.log( `Registered media root ${ mediaRoots.add( path ) }` ) );
