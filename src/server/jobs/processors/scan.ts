import { mediaRoots } from '@/src/server/media/roots';
import { mediaScanner } from '@/src/server/media/scanner';
import type { MediaJob } from '@/src/shared/types';


export async function processScanJob ( job: MediaJob, signal: AbortSignal ) : Promise< void > {
  if ( job.job_type !== 'scan' || job.media_id !== null ) throw new Error( 'Invalid scan job' );
  signal.throwIfAborted();

  const roots = mediaRoots.list( true );

  if ( roots.length === 0 ) {
    console.warn( 'Media scan skipped: no enabled media roots.' );
    return;
  }

  const result = await mediaScanner.scan( roots, signal );
  signal.throwIfAborted();

  console.log(
    `Media scan finished: ${ result.discovered } files found, ` +
    `${ result.ignored } ignored, ${ result.errors } errors`
  );

  if ( result.errors > 0 ) throw new Error( `Media scan finished with ${ result.errors } errors` );
}
