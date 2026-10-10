import type { JobProcessor } from '../worker';
import { processMetadataJob } from './metadata';
import { processScanJob } from './scan';


export const processMediaJob: JobProcessor = async job => {
  switch ( job.job_type ) {
    case 'scan': return await processScanJob( job );
    case 'metadata': return await processMetadataJob( job );
    default: throw new Error( `Unsupported media job type: ${ job.job_type }` );
  }
};
