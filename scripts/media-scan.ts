import { closeDatabase } from '@/src/server/db';
import { enqueueJob } from '@/src/server/jobs/queue';


try {
  enqueueJob( null, 'scan', 10 );
  console.log( 'Media scan queued.' );
} catch ( error ) {
  console.error( error );
  process.exitCode = 1;
} finally {
  closeDatabase();
}
