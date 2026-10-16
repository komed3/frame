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

  private static normalize ( tracks: MediaTrackInput[] ) : MediaTrackInput[] {
    if ( ! Array.isArray( tracks ) ) throw new Error( 'Tracks must be an array' );
    const indexes = new Set< number >();

    return tracks.map( track => {
      if ( ! Number.isSafeInteger( track.streamIndex ) || track.streamIndex < 0 )
        throw new Error( `Invalid stream index: ${ track.streamIndex }` );

      if ( indexes.has( track.streamIndex ) )
        throw new Error( `Duplicate stream index: ${ track.streamIndex }` );

      indexes.add( track.streamIndex );

      if ( ! TRACK_KINDS.includes( track.kind ) )
        throw new Error( `Invalid track kind: ${ track.kind }` );

      for ( const key of [ 'codec', 'language', 'title' ] as const ) {
        const value = track[ key ];

        if ( value !== undefined && value !== null && typeof value !== 'string' )
          throw new Error( `Invalid track ${ key } at stream ${ track.streamIndex }` );
      }

      for ( const key of [ 'width', 'height', 'sampleRate', 'channels' ] as const ) {
        const value = track[ key ];

        if ( value !== undefined && value !== null && ( ! Number.isSafeInteger( value ) || value < 1 ) )
          throw new Error( `Invalid track ${ key } at stream ${ track.streamIndex }` );
      }

      for ( const key of [ 'fps' ] as const ) {
        const value = track[ key ];

        if ( value !== undefined && value !== null && ( ! Number.isFinite( value ) || value <= 0 ) )
          throw new Error( `Invalid track ${ key } at stream ${ track.streamIndex }` );
      }

      if (
        track.bitrate !== undefined && track.bitrate !== null &&
        ( ! Number.isSafeInteger( track.bitrate ) || track.bitrate < 0 )
      ) throw new Error( `Invalid track bitrate at stream ${ track.streamIndex }` );

      for ( const key of [ 'isDefault', 'isForced' ] as const ) {
        const value = track[ key ];

        if ( value !== undefined && typeof value !== 'boolean' )
          throw new Error( `Invalid track ${ key } at stream ${ track.streamIndex }` );
      }

      if (
        track.data !== undefined &&
        ( ! track.data || typeof track.data !== 'object' || Array.isArray( track.data ) )
      ) throw new Error( `Invalid track data at stream ${ track.streamIndex }` );

      return track;
    } );
  }
}
