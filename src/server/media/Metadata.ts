import { as, conn, db } from '@/src/server/core/Database';
import { Media } from '@/src/server/media/Media';
import { assertId, normalizeString } from '@/src/server/utils';
import type { MediaMetadataInput, MediaMetadataRecord, MediaMetadataSource } from '@/src/shared/types/metadata';


const normalize = ( key: string ) => normalizeString( key, 'Metadata key' );


export class MediaMetadata {
  private static assertSource ( source: MediaMetadataSource ) : void {
    if ( source !== 'manual' && source !== 'scan' ) throw new Error( `Invalid metadata source: ${ source }` );
  }

  private static normalizeEntries ( entries: MediaMetadataInput[] ) : MediaMetadataInput[] {
    if ( ! Array.isArray( entries ) ) throw new Error( 'Metadata entries must be an array' );
    const keys = new Set< string >();

    return entries.map( entry => {
      const key = normalize( entry.key );
      if ( typeof entry.value !== 'string' ) throw new Error( `Invalid metadata value for key: ${ key }` );

      const normalizedKey = key.toLocaleLowerCase();
      if ( keys.has( normalizedKey ) ) throw new Error( `Duplicate metadata key: ${ key }` );

      keys.add( normalizedKey );
      return { key, value: entry.value };
    } );
  }

  public static list ( mediaId: number, source?: MediaMetadataSource ) : MediaMetadataRecord[] {
    Media.assertMediaIdSafe( mediaId );
    if ( source !== undefined ) MediaMetadata.assertSource( source );

    return as< MediaMetadataRecord[] >( conn().prepare( `
      SELECT
        id, media_id AS mediaId, key, value, source,
        updated_at AS updatedAt
      FROM media_metadata
      WHERE media_id = ? ${ source === undefined ? '' : 'AND source = ?' }
      ORDER BY key COLLATE NOCASE, source, id
    ` ).all( ...( source === undefined ? [ mediaId ] : [ mediaId, source ] ) ) );
  }

  public static get ( mediaId: number, key: string, source: MediaMetadataSource = 'manual' ) : MediaMetadataRecord | null {
    Media.assertMediaIdSafe( mediaId );
    MediaMetadata.assertSource( source );

    const row = as< MediaMetadataRecord | undefined >( conn().prepare( `
      SELECT
        id, media_id AS mediaId, key, value, source,
        updated_at AS updatedAt
      FROM media_metadata
      WHERE media_id = ? AND key = ? AND source = ?
    ` ).get( mediaId, normalize( key ), source ) );

    return row ?? null;
  }
}
