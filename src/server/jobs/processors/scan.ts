import { getEnabledMediaRoots } from '@/src/server/media/roots';
import { scanMediaRoots } from '@/src/server/media/scanner';
import type { MediaJob } from '@/src/shared/types';


export async function processScanJob ( job: MediaJob ) : Promise< void > {
  if ( job.job_type !== 'scan' || job.media_id !== null ) throw new Error( 'Invalid scan job' );

  const roots = getEnabledMediaRoots();

  if ( roots.length === 0 ) {
    console.warn( 'Media scan skipped: no enabled media roots.' );
    return;
  }

  const result = await scanMediaRoots( roots );

  console.log(
    `Media scan finished: ${ result.discovered } files found, ` +
    `${ result.ignored } ignored, ${ result.errors } errors`
  );

  if ( result.errors > 0 ) throw new Error( `Media scan finished with ${ result.errors } errors` );
}
