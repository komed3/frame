import { registry } from '@/src/server/job/Registry';
import { MetadataJob } from '@/src/server/job/handler/Metadata';
import { ScanJob } from '@/src/server/job/handler/Scan';
import { TextJob } from '@/src/server/job/handler/Text';
import { TracksJob } from '@/src/server/job/handler/Tracks';


registry.register( 'scan', new ScanJob() );
registry.register( 'metadata', new MetadataJob() );
registry.register( 'tracks', new TracksJob() );
registry.register( 'text', new TextJob() );
