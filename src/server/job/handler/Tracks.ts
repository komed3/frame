import { Media } from '@/src/server/media/Media';
import { MediaRoots } from '@/src/server/media/Roots';
import { MediaTracks } from '@/src/server/media/Tracks';
import { execFileAsync } from '@/src/server/utils';
import type { JobContext, JobHandler, ProbeData, ProbeStream } from '@/src/shared/types/job';
import type { MediaTrackInput, MediaTrackKind } from '@/src/shared/types/tracks';
import { stat } from 'node:fs/promises';


export class TracksJob implements JobHandler {
  private tag ( tags: Record< string, string > | undefined, key: string ) : string | null {
    return Object.entries( tags ?? {} ).find( ( [ name ] ) => name.toLowerCase() === key )?.[ 1 ] ?? null;
  }

  private kind ( type?: string ) : MediaTrackKind | null {
    if ( type === 'video' || type === 'audio' || type === 'subtitle' || type === 'data' ) return type;
    return null;
  }
}
