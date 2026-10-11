import { db } from '@/src/server/db';
import type { MediaJob, MediaJobType } from '@/src/shared/types';


const retryDelayMs = 60_000;
const lockTimeoutMs = 30 * 60_000;
