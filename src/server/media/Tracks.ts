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
      assertId( track.streamIndex, 'stream' );

      if ( indexes.has( track.streamIndex ) ) throw new Error( `Duplicate stream index: ${ track.streamIndex }` );
      indexes.add( track.streamIndex );

      if ( ! TRACK_KINDS.includes( track.kind ) ) throw new Error( `Invalid track kind: ${ track.kind }` );

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

  public static list ( mediaId: number ) : MediaTrackRecord[] {
    Media.assertMediaIdSafe( mediaId );

    const rows = as< MediaTrackRow[] >( conn().prepare( `
      SELECT
        id, media_id AS mediaId, stream_index AS streamIndex, kind, codec, language, title,
        is_default AS isDefault, is_forced AS isForced, width, height, fps, bitrate,
        sample_rate AS sampleRate, channels, data_json AS dataJson
      FROM tracks
      WHERE media_id = ?
      ORDER BY stream_index, id
    ` ).all( mediaId ) );

    return rows.map( row => MediaTracks.mapRow( row ) );
  }

  public static get ( mediaId: number, streamIndex: number ) : MediaTrackRecord | null {
    Media.assertMediaIdSafe( mediaId );
    assertId( streamIndex, 'stream' );

    const row = as< MediaTrackRow | undefined >( conn().prepare( `
      SELECT
        id, media_id AS mediaId, stream_index AS streamIndex, kind, codec, language, title,
        is_default AS isDefault, is_forced AS isForced, width, height, fps, bitrate,
        sample_rate AS sampleRate, channels, data_json AS dataJson
      FROM tracks
      WHERE media_id = ? AND stream_index = ?
    ` ).get( mediaId, streamIndex ) );

    return row ? MediaTracks.mapRow( row ) : null;
  }

  public static replace ( mediaId: number, tracks: MediaTrackInput[] ) : void {
    Media.assertMediaIdSafe( mediaId );

    db.transaction( tx => {
      tx.prepare( 'DELETE FROM tracks WHERE media_id = ?' ).run( mediaId );

      const insert = tx.prepare( `
        INSERT INTO tracks (
          media_id, stream_index, kind, codec, language, title, is_default, is_forced,
          width, height, fps, bitrate, sample_rate, channels, data_json
        )
        VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? )
      ` );

      for ( const track of MediaTracks.normalize( tracks ) ) insert.run(
        mediaId, track.streamIndex, track.kind, track.codec ?? null,
        track.language ?? null, track.title ?? null, +( track.isDefault ?? false ),
        +( track.isForced ?? false ), track.width ?? null, track.height ?? null,
        track.fps ?? null, track.bitrate ?? null, track.sampleRate ?? null,
        track.channels ?? null, JSON.stringify( track.data ?? {} )
      );
    } );
  }

  public static clear ( mediaId: number ) : void {
    Media.assertMediaIdSafe( mediaId );
    conn().prepare( 'DELETE FROM tracks WHERE media_id = ?' ).run( mediaId );
  }
}
