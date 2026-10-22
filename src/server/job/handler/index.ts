import { registry } from '@/src/server/job/Registry';
import { FramesJob } from '@/src/server/job/handler/Frames';
import { MetadataJob } from '@/src/server/job/handler/Metadata';
import { PreviewJob } from '@/src/server/job/handler/Preview';
import { ScanJob } from '@/src/server/job/handler/Scan';
import { TextJob } from '@/src/server/job/handler/Text';
import { TracksJob } from '@/src/server/job/handler/Tracks';
import { WaveJob } from '@/src/server/job/handler/Wave';


registry.register( 'scan', new ScanJob() );
registry.register( 'metadata', new MetadataJob() );
registry.register( 'tracks', new TracksJob() );
registry.register( 'text', new TextJob() );
registry.register( 'preview', new PreviewJob() );
registry.register( 'frames', new FramesJob() );
registry.register( 'wave', new WaveJob() );
