import { registry } from '@/src/server/job/Registry';
import { MetadataJob } from '@/src/server/job/handler/Metadata';
import { ScanJob } from '@/src/server/job/handler/Scan';


registry.register( 'scan', new ScanJob() );
registry.register( 'metadata', new MetadataJob() );
