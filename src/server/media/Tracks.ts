import { as, conn, db } from '@/src/server/core/Database';
import { Media } from '@/src/server/media/Media';
import { assertId } from '@/src/server/utils';
import type { MediaTrackInput, MediaTrackKind, MediaTrackRecord } from '@/src/shared/types/tracks';


const TRACK_KINDS: MediaTrackKind[] = [ 'video', 'audio', 'subtitle', 'data' ];
