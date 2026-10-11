import { Command } from 'commander';
import { closeDatabase, db } from '@/src/server/db';
import { enqueueJob } from '@/src/server/jobs/queue';
import { mediaRoots } from '@/src/server/media/roots';


const cli = new Command();
cli.name( 'frame' ).description( 'Frame media library maintenance' ).version( '2.0.0' );


// --- media roots ---

const roots = cli.command( 'roots' ).description( 'Manage media roots' );

roots.command( 'add <path>' ).description( 'Register a media directory' ).action(
  ( path: string ) => console.log( `Registered media root ${ mediaRoots.add( path ) }` )
);

roots.command( 'list' ).description( 'List media directories' ).action( () => {
  const allRoots = db.prepare( 'SELECT id, path, enabled, last_scan_at FROM media_roots ORDER BY id' ).all() as {
    id: number, path: string, enabled: number, last_scan_at: string | null
  }[];

  for ( const root of allRoots ) console.log(
    `${ root.id } [${ root.enabled ? 'enabled' : 'disabled' }] ${ root.path }` +
    ` (last scan: ${ root.last_scan_at ?? 'never' })`
  );
} );

for ( const action of [ 'enable', 'disable' ] as const ) roots.command( `${ action } <id>` )
  .description( `${ action } a media directory` ).action( ( idText: string ) => {
    if ( ! /^\d+$/.test( idText ) ) throw new Error( 'ID must be an integer' );

    mediaRoots.setEnabled( Number( idText ), action === 'enable' );
    console.log( `Media root ${ idText } ${ action }d` );
  } );


// --- scanning ---

cli.command( 'scan' ).description( 'Queue a full media scan' ).action( () => {
  enqueueJob( null, 'scan', 10 );
  console.log( 'Media scan queued' );
} );
