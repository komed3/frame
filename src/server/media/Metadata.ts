import { as, conn, db } from '@/src/server/core/Database';
import { Media } from '@/src/server/media/Media';
import { assertId, normalizeString } from '@/src/server/utils';
import type { MediaMetadataInput, MediaMetadataRecord, MediaMetadataSource } from '@/src/shared/types/metadata';


export class MediaMetadata {}
