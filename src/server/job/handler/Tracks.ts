import { Media } from '@/src/server/media/Media';
import { MediaRoots } from '@/src/server/media/Roots';
import { MediaTracks } from '@/src/server/media/Tracks';
import { execFileAsync } from '@/src/server/utils';
import type { JobContext, JobHandler, ProbeData, ProbeStream } from '@/src/shared/types/job';
import type { MediaTrackInput, MediaTrackKind } from '@/src/shared/types/tracks';
import { stat } from 'node:fs/promises';
import { parsePositive, parseRate } from '@/src/server/job/handler/parse';


export class TracksJob implements JobHandler {
  private tag ( tags: Record< string, string > | undefined, key: string ) : string | null {
    return Object.entries( tags ?? {} ).find( ( [ name ] ) => name.toLowerCase() === key )?.[ 1 ] ?? null;
  }

  private kind ( type?: string ) : MediaTrackKind | null {
    if ( type === 'video' || type === 'audio' || type === 'subtitle' || type === 'data' ) return type;
    return null;
  }

  private extract ( streams: ProbeStream[] ) : MediaTrackInput[] {
    return streams.flatMap( ( stream, index ) => {
      const kind = this.kind( stream.codec_type );
      if ( ! kind ) return [];

      const tags = stream.tags ?? {};

      return [ {
        streamIndex: stream.index ?? index,
        kind,
        codec: stream.codec_name ?? null,
        language: this.tag( tags, 'language' ),
        title: this.tag( tags, 'title' ),
        isDefault: Boolean( stream.disposition?.default ),
        isForced: Boolean( stream.disposition?.forced ),
        width: parsePositive( stream.width ),
        height: parsePositive( stream.height ),
        fps: kind === 'video'
          ? parseRate( stream.avg_frame_rate ) ?? parseRate( stream.r_frame_rate )
          : null,
        bitrate: parsePositive( stream.bit_rate ),
        sampleRate: parsePositive( stream.sample_rate ),
        channels: parsePositive( stream.channels ),
        data: {
          codecLongName: stream.codec_long_name ?? null,
          profile: stream.profile ?? null,
          channelLayout: stream.channel_layout ?? null,
          pixelFormat: stream.pix_fmt ?? null,
          sampleFormat: stream.sample_fmt ?? null,
          attachedPicture: Boolean( stream.disposition?.attached_pic ),
          tags,
          disposition: stream.disposition ?? {}
        }
      } ];
    } );
  }
}
