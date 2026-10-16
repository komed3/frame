import { as, conn, db } from '@/src/server/core/Database';
import { Media } from '@/src/server/media/Media';
import { assertId, normalizeString } from '@/src/server/utils';
import type { MediaMetadataInput, MediaMetadataRecord, MediaMetadataSource } from '@/src/shared/types/metadata';


export class MediaMetadata {
  private static assertSource ( source: MediaMetadataSource ) : void {
    if ( source !== 'manual' && source !== 'scan' ) throw new Error( `Invalid metadata source: ${ source }` );
  }

  private static normalizeEntries ( entries: MediaMetadataInput[] ) : MediaMetadataInput[] {
    if ( ! Array.isArray( entries ) ) throw new Error( 'Metadata entries must be an array' );
    const keys = new Set< string >();

    return entries.map( entry => {
      const key = normalizeString( entry.key, 'Metadata key' );
      if ( typeof entry.value !== 'string' ) throw new Error( `Invalid metadata value for key: ${ key }` );

      const normalizedKey = key.toLocaleLowerCase();
      if ( keys.has( normalizedKey ) ) throw new Error( `Duplicate metadata key: ${ key }` );

      keys.add( normalizedKey );
      return { key, value: entry.value };
    } );
  }
}
