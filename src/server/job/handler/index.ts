import { registry } from '@/src/server/job/Registry';
import { ScanJob } from '@/src/server/job/handler/Scan';


registry.register( 'scan', new ScanJob() );
