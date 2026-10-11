import { Command } from 'commander';
import { closeDatabase, db } from '@/src/server/db';
import { enqueueJob } from '@/src/server/jobs/queue';
import { mediaRoots } from '@/src/server/media/roots';


const frame = new Command();

frame
  .name( 'frame' )
  .description( 'Frame media library maintenance' )
  .version( '2.0.0' );


// --- media roots ---

const roots = frame
  .command( 'roots' )
  .description( 'Manage media roots' );

roots
  .command( 'add <path>' )
  .description( 'Register a media directory' )
  .action( ( path: string ) => console.log( `Registered media root ${ mediaRoots.add( path ) }` ) );

roots
  .command( 'list' )
  .description( 'List media directories' )
  .action( () => {
    const allRoots = db.prepare( 'SELECT id, path, enabled, last_scan_at FROM media_roots ORDER BY id' ).all() as {
      id: number, path: string, enabled: number, last_scan_at: string | null
    }[];

    for ( const root of allRoots ) console.log(
      `${ root.id } [${ root.enabled ? 'enabled' : 'disabled' }] ${ root.path }` +
      ` (last scan: ${ root.last_scan_at ?? 'never' })`
    );
  } );

for ( const action of [ 'enable', 'disable' ] as const ) roots
  .command( `${ action } <id>` )
  .description( `${ action } a media directory` ).action( ( idText: string ) => {
    if ( ! /^\d+$/.test( idText ) ) throw new Error( 'ID must be an integer' );

    mediaRoots.setEnabled( Number( idText ), action === 'enable' );
    console.log( `Media root ${ idText } ${ action }d` );
  } );


// --- scanning ---

frame
  .command( 'scan' )
  .description( 'Queue a full media scan' )
  .action( () => {
    enqueueJob( null, 'scan', 10 );
    console.log( 'Media scan queued' );
  } );


// --- metadata ---

frame
  .command( 'metadata' )
  .description( 'Queue metadata extraction' )
  .option( '--all', 'Re-extract metadata for all available media' )
  .option( '--failed', 'Retry failed metadata jobs' )
  .option( '--id <id>', 'Process one media item' )
  .action( ( options: { all?: boolean; failed?: boolean; id?: string } ) => {
    let rows: { id: number }[];

    if ( options.id ) {
      if ( ! /^\d+$/.test( options.id ) ) throw new Error( 'ID must be an integer' );

      rows = db.prepare( 'SELECT id FROM media WHERE id = ? AND is_available = 1' )
        .all( Number( options.id ) ) as { id: number }[];
    }

    else if ( options.failed ) rows = db.prepare( `
      SELECT DISTINCT media.id FROM media
      JOIN media_jobs ON media_jobs.media_id = media.id
      WHERE media.is_available = 1
        AND media_jobs.job_type = 'metadata'
        AND media_jobs.status = 'failed'
      ORDER BY media.id
    ` ).all() as { id: number }[];

    else rows = db.prepare( `
      SELECT id FROM media
      WHERE is_available = 1
        AND (? = 1 OR metadata_json = '{}'
          OR json_extract(metadata_json, '$.probeError') IS NOT NULL)
      ORDER BY id
    ` ).all( options.all ? 1 : 0 ) as { id: number }[];

    for ( const row of rows ) enqueueJob( row.id, 'metadata', 10 );
    console.log( `Metadata jobs queued: ${ rows.length }` );
  } );


// --- assets ---

frame
  .command( 'assets' )
  .description( 'Queue asset generation' )
  .option( '--all', 'Regenerate all assets' )
  .action( ( options: { all?: boolean } ) => {
    const rows = db.prepare( `
      SELECT id, media_type, file_name, audio_codec
      FROM media
      WHERE is_available = 1
      ORDER BY id
    ` ).all() as {
      id: number;
      media_type: string;
      file_name: string;
      audio_codec: string | null;
    }[];

    let queued = 0;

    for ( const media of rows ) {
      const assets: Array< [ string, number ] > = [];

      if ( [ 'video', 'audio', 'image' ].includes( media.media_type ) ) assets.push( [ 'poster', 8 ], [ 'thumb', 5 ] );
      if ( media.media_type === 'video' ) assets.push( [ 'frames', 2 ] );
      if ( [ 'audio', 'video' ].includes( media.media_type ) && media.audio_codec ) assets.push( [ 'wave', 3 ] );
      if ( media.media_type === 'text' ) assets.push( [ 'text', 4 ] );

      for ( const [ type, priority ] of assets ) {
        if ( ! options.all ) {
          const exists = db.prepare( `
            SELECT 1 FROM media_assets
            WHERE media_id = ? AND asset_type = ? AND
              source_fingerprint = ( SELECT content_hash FROM media WHERE id = ? )
          ` ).get( media.id, type, media.id );

          if ( exists ) continue;
        }

        enqueueJob( media.id, type as 'poster' | 'thumb' | 'frames' | 'wave' | 'text', priority );
        queued++;
      }
    }

    console.log( `Asset jobs queued: ${ queued }` );
  } );
