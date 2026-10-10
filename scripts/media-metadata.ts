import { closeDatabase, db } from '../src/server/db';
import { enqueueJob } from '../src/server/jobs/queue';


type MetadataMode = 'missing' | 'failed' | 'all';


function usage () : never {
  console.log( 'Usage:' );
  console.log( 'npm run media-metadata              Queue missing metadata' );
  console.log( 'npm run media-metadata -- --missing Queue missing metadata' );
  console.log( 'npm run media-metadata -- --failed  Retry failed metadata jobs' );
  console.log( 'npm run media-metadata -- --all     Re-extract all metadata' );
  console.log( 'npm run media-metadata -- --id <id> Re-extract one media item' );
  process.exit( 1 );
}

function getMediaIds ( mode: MetadataMode ) : number[] {
  let rows: { id: number }[];

  switch ( mode ) {
    case 'all':
      rows = db.prepare( `
        SELECT id
        FROM media
        WHERE is_available = 1
        ORDER BY id
      ` ).all() as { id: number }[];
      break;

    case 'failed':
      rows = db.prepare( `
        SELECT media.id
        FROM media
        JOIN media_jobs ON media_jobs.media_id = media.id
        WHERE media.is_available = 1
          AND media_jobs.job_type = 'metadata'
          AND media_jobs.status = 'failed'
        ORDER BY media.id
      ` ).all() as { id: number }[];
      break;

    case 'missing':
      rows = db.prepare( `
        SELECT id
        FROM media
        WHERE is_available = 1
          AND (
            metadata_json = '{}'
            OR json_extract( metadata_json, '$.probeError' ) IS NOT NULL
          )
        ORDER BY id
      ` ).all() as { id: number }[];
      break;
  }

  return rows.map( row => row.id );
}

function main () : void {
  const args = process.argv.slice( 2 );
  let mode: MetadataMode = 'missing', mediaId: number | null = null;

  if ( args.length > 0 ) {
    if ( args.length === 1 && [ '--missing', '--failed', '--all' ].includes( args[ 0 ] ) )
      mode = args[ 0 ].slice( 2 ) as MetadataMode;

    else if ( args.length === 2 && args[ 0 ] === '--id' && /^\d+$/.test( args[ 1 ] ) )
      mediaId = Number( args[ 1 ] );

    else usage();
  }

  const mediaIds = mediaId === null ? getMediaIds( mode ) : ( db.prepare( `
    SELECT id
    FROM media
    WHERE id = ? AND is_available = 1
  ` ).get( mediaId ) ? [ mediaId ] : [] );

  for ( const id of mediaIds ) enqueueJob( id, 'metadata', 20 );

  console.log( `Queued metadata jobs: ${ mediaIds.length }` );
  if ( mediaIds.length === 0 ) console.log( 'Nothing to do.' );
}
