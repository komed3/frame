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
  }
}
