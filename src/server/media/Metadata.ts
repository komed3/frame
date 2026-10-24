import { Config } from '@/src/server/core/Config';
import { as, conn, db } from '@/src/server/core/Database';
import { Media } from '@/src/server/media/Media';
import { generateId, normalizeString } from '@/src/server/utils';
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

  public static list ( mediaId: string, source?: MediaMetadataSource ) : MediaMetadataRecord[] {
    Media.assertMediaIdSafe( mediaId );
    if ( source !== undefined ) MediaMetadata.assertSource( source );

    return as< MediaMetadataRecord[] >( conn().prepare( `
      SELECT id, media_id AS mediaId, key, value, source, updated_at AS updatedAt
      FROM media_metadata
      WHERE media_id = ? ${ source === undefined ? '' : 'AND source = ?' }
      ORDER BY key COLLATE NOCASE, source, id
    ` ).all( ...( source === undefined ? [ mediaId ] : [ mediaId, source ] ) ) );
  }

  public static get ( mediaId: string, key: string, source: MediaMetadataSource = 'manual' ) : MediaMetadataRecord | null {
    Media.assertMediaIdSafe( mediaId );
    MediaMetadata.assertSource( source );

    const row = as< MediaMetadataRecord | undefined >( conn().prepare( `
      SELECT id, media_id AS mediaId, key, value, source, updated_at AS updatedAt
      FROM media_metadata
      WHERE media_id = ? AND key = ? AND source = ?
    ` ).get( mediaId, normalize( key ), source ) );

    return row ?? null;
  }

  public static set ( mediaId: string, key: string, value: string, source: MediaMetadataSource = 'manual' ) : string {
    Media.assertMediaIdSafe( mediaId );
    MediaMetadata.assertSource( source );

    const normalizedKey = normalize( key );
    if ( typeof value !== 'string' ) throw new Error( `Invalid metadata value for key: ${ normalizedKey }` );

    const id = generateId( Config.get( 'ID_LENGTH' ) );
    const row = as< { id: string } | undefined >( conn().prepare( `
      INSERT INTO media_metadata ( id, media_id, key, value, source )
      VALUES ( ?, ?, ?, ?, ? )
      ON CONFLICT ( media_id, key, source ) DO UPDATE SET
        value = excluded.value,
        updated_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )
      RETURNING id
    ` ).get( id, mediaId, normalizedKey, value, source ) );

    if ( ! row ) throw new Error( `Could not save metadata: ${ normalizedKey }` );
    return row.id;
  }

  public static delete ( mediaId: string, key: string, source: MediaMetadataSource = 'manual' ) : void {
    Media.assertMediaIdSafe( mediaId );
    MediaMetadata.assertSource( source );

    const result = conn().prepare(
      'DELETE FROM media_metadata WHERE media_id = ? AND key = ? AND source = ?'
    ).run( mediaId, normalize( key ), source );

    if ( Number( result.changes ) !== 1 ) throw new Error( `Metadata key does not exist: ${ key }` );
  }

  public static replaceScan ( mediaId: string, entries: MediaMetadataInput[] ) : void {
    Media.assertMediaIdSafe( mediaId );
    const normalizedEntries = MediaMetadata.normalizeEntries( entries );

    db.transaction( tx => {
      tx.prepare( 'DELETE FROM media_metadata WHERE media_id = ? AND source = ?' ).run( mediaId, 'scan' );

      const insert = tx.prepare( `
        INSERT INTO media_metadata ( id, media_id, key, value, source )
        VALUES ( ?, ?, ?, ?, 'scan' )
      ` );

      for ( const entry of normalizedEntries )
        insert.run( generateId( Config.get( 'ID_LENGTH' ) ), mediaId, entry.key, entry.value );
    } );
  }
}
