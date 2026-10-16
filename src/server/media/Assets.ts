import { Config } from '@/src/server/core/Config';
import { as, conn } from '@/src/server/core/Database';
import { Media } from '@/src/server/media/Media';
import { assertRelativePath } from '@/src/server/utils';
import type { MediaAssetInput, MediaAssetKind, MediaAssetRecord, MediaAssetRow } from '@/src/shared/types/assets';
import { resolve } from 'node:path';


const ASSET_KINDS: MediaAssetKind[] = [ 'poster', 'thumb', 'frames', 'wave', 'text', 'subtitle' ];


export class MediaAssets {
  private static mapRow ( row: MediaAssetRow ) : MediaAssetRecord {
    const data = JSON.parse( row.dataJson ) as unknown;

    if ( ! data || typeof data !== 'object' || Array.isArray( data ) )
      throw new Error( `Invalid asset data JSON for asset ${ row.id }` );

    return { ...row, data: data as Record< string, unknown > };
  }

  public static resolvePath ( path: string ) : string {
    assertRelativePath( path, 'asset' );
    return resolve( Config.get( 'ASSETS_PATH' ), path );
  }

  public static list ( mediaId: number, kind?: MediaAssetKind ) : MediaAssetRecord[] {
    Media.assertMediaIdSafe( mediaId );
    if ( kind !== undefined && ! ASSET_KINDS.includes( kind ) ) throw new Error( `Invalid asset kind: ${ kind }` );

    const rows = as< MediaAssetRow[] >( conn().prepare( `
      SELECT
        id, media_id AS mediaId, kind, variant, path, fingerprint,
        mime_type AS mimeType, size_bytes AS sizeBytes, width, height,
        data_json AS dataJson, created_at AS createdAt
      FROM assets
      WHERE media_id = ? ${ kind === undefined ? '' : 'AND kind = ?' }
      ORDER BY kind, variant, id
    ` ).all( ...( kind === undefined ? [ mediaId ] : [ mediaId, kind ] ) ) );

    return rows.map( row => MediaAssets.mapRow( row ) );
  }

  public static get ( mediaId: number, kind: MediaAssetKind, variant = 'default' ) : MediaAssetRecord | null {
    Media.assertMediaIdSafe( mediaId );

    if ( ! ASSET_KINDS.includes( kind ) ) throw new Error( `Invalid asset kind: ${ kind }` );
    if ( typeof variant !== 'string' || ! variant.trim() ) throw new Error( 'Asset variant must not be empty' );

    const row = as< MediaAssetRow | undefined >( conn().prepare( `
      SELECT
        id, media_id AS mediaId, kind, variant, path, fingerprint,
        mime_type AS mimeType, size_bytes AS sizeBytes, width, height,
        data_json AS dataJson, created_at AS createdAt
      FROM assets
      WHERE media_id = ? AND kind = ? AND variant = ?
    ` ).get( mediaId, kind, variant.trim() ) );

    return row ? MediaAssets.mapRow( row ) : null;
  }
}
