import { getEnabledMediaRoots } from '../../media/roots';
import { scanMediaRoot } from '../../media/scanner';
import type { MediaJob } from '../queue';


export async function processScanJob ( job: MediaJob ) : Promise< void > {
  if ( job.job_type !== 'scan' || job.media_id !== null ) throw new Error( 'Invalid scan job' );

  const roots = getEnabledMediaRoots();

  for ( const root of roots ) {
    const result = await scanMediaRoot( root );

    console.log(
      `Scanned ${ root.path }: ${ result.discovered } registered, ` +
      `${ result.ignored } ignored, ${ result.errors } errors`
    );
  }
}
