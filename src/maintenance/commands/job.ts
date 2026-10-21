import { parseNumber, parseValue } from '@/src/maintenance/utils/parse';
import { ui } from '@/src/maintenance/utils/ui';
import { JobQueue, JOB_KINDS } from '@/src/server/job/Queue';
import { Media } from '@/src/server/media/Media';
import { MediaRoots } from '@/src/server/media/Roots';
import { resolveId, validateEnum } from '@/src/server/utils';
import type { JobKind, JobStatus } from '@/src/shared/types/job';
import { Command } from 'commander';
