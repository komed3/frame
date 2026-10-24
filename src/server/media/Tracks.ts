import { Config } from '@/src/server/core/Config';
import { as, conn, db } from '@/src/server/core/Database';
import { Media } from '@/src/server/media/Media';
import { generateId } from '@/src/server/utils';
import type { MediaTrackInput, MediaTrackKind, MediaTrackRecord, MediaTrackRow } from '@/src/shared/types/tracks';


export const TRACK_KINDS: MediaTrackKind[] = [ 'video', 'audio', 'subtitle', 'data' ];


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

  public static list ( mediaId: string ) : MediaTrackRecord[] {
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

  public static get ( mediaId: string, streamIndex: number ) : MediaTrackRecord | null {
    Media.assertMediaIdSafe( mediaId );

    if ( ! Number.isSafeInteger( streamIndex ) || streamIndex < 0 )
      throw new Error( `Invalid stream index: ${ streamIndex }` );

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

  public static replace ( mediaId: string, tracks: MediaTrackInput[] ) : void {
    Media.assertMediaIdSafe( mediaId );

    db.transaction( tx => {
      tx.prepare( 'DELETE FROM tracks WHERE media_id = ?' ).run( mediaId );

      const insert = tx.prepare( `
        INSERT INTO tracks (
          id, media_id, stream_index, kind, codec, language, title, is_default, is_forced,
          width, height, fps, bitrate, sample_rate, channels, data_json
        )
        VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? )
      ` );

      for ( const track of tracks ) insert.run(
        generateId( Config.get( 'ID_LENGTH' ) ),
        mediaId, track.streamIndex, track.kind, track.codec ?? null,
        track.language ?? null, track.title ?? null, +( track.isDefault ?? false ),
        +( track.isForced ?? false ), track.width ?? null, track.height ?? null,
        track.fps ?? null, track.bitrate ?? null, track.sampleRate ?? null,
        track.channels ?? null, JSON.stringify( track.data ?? {} )
      );
    } );
  }

  public static clear ( mediaId: string ) : void {
    Media.assertMediaIdSafe( mediaId );
    conn().prepare( 'DELETE FROM tracks WHERE media_id = ?' ).run( mediaId );
  }
}
