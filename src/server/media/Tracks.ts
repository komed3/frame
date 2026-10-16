import { as, conn, db } from '@/src/server/core/Database';
import { Media } from '@/src/server/media/Media';
import { assertId } from '@/src/server/utils';
import type { MediaTrackInput, MediaTrackKind, MediaTrackRecord, MediaTrackRow } from '@/src/shared/types/tracks';


const TRACK_KINDS: MediaTrackKind[] = [ 'video', 'audio', 'subtitle', 'data' ];


export class MediaTracks {
  private static mapRow ( row: MediaTrackRow ) : MediaTrackRecord {
    const data = JSON.parse( row.dataJson ) as unknown;

    if ( ! data || typeof data !== 'object' || Array.isArray( data ) )
      throw new Error( `Invalid track data JSON for track ${ row.id }` );

    return {
      ...row, isDefault: row.isDefault === 1, isForced: row.isForced === 1,
      data: data as Record< string, unknown >
    };
  }
}
