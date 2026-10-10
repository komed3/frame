import { getEnabledMediaRoots } from '../../media/roots';
import { scanMediaRoot } from '../../media/scanner';
import type { MediaJob } from '../queue';


export async function processScanJob ( job: MediaJob ) : Promise< void > {
  if ( job.job_type !== 'scan' || job.media_id !== null ) throw new Error( 'Invalid scan job' );

  const roots = getEnabledMediaRoots();

  if ( roots.length === 0 ) {
    console.warn( 'Media scan skipped: no enabled media roots.' );
    return;
  }

  let errors = 0;

  for ( const root of roots ) {
    try {
      const result = await scanMediaRoot( root );
      errors += result.errors;

      console.log(
        `Scanned ${ root.path }: ${ result.discovered } files found, ` +
        `${ result.ignored } ignored, ${ result.errors } errors`
      );
    } catch ( error ) {
      errors++;
      console.error( `Failed to scan media root ${ root.path }:`, error );
    }
  }

  if ( errors > 0 ) throw new Error( `Media scan finished with ${ errors } errors` );
}
