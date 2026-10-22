import { Media } from '@/src/server/media/Media';
import { MediaRoots } from '@/src/server/media/Roots';
import { MediaTracks } from '@/src/server/media/Tracks';
import { execFileAsync } from '@/src/server/utils';
import type { JobContext, JobHandler, ProbeData, ProbeStream } from '@/src/shared/types/job';
import type { MediaTrackInput, MediaTrackKind } from '@/src/shared/types/tracks';
import { stat } from 'node:fs/promises';
