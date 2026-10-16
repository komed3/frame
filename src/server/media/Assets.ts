import { randomUUID } from 'node:crypto';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { Config } from '@/src/server/core/Config';
import { as, conn } from '@/src/server/core/Database';
import { Media } from '@/src/server/media/Media';
import { assertRelativePath } from '@/src/server/utils';
import type { MediaAssetInput, MediaAssetKind, MediaAssetRecord, MediaAssetRow } from '@/src/shared/types/assets';


const ASSET_KINDS: MediaAssetKind[] = [ 'poster', 'thumb', 'frames', 'wave', 'text', 'subtitle' ];


export class MediaAssets {
  private static assertKind ( kind?: MediaAssetKind, variant = 'default' ) : void {
    if ( kind && ! ASSET_KINDS.includes( kind ) ) throw new Error( `Invalid asset kind: ${ kind }` );
    if ( typeof variant !== 'string' || ! variant.trim() ) throw new Error( 'Asset variant must not be empty' );
  }

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
    MediaAssets.assertKind( kind );

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
    MediaAssets.assertKind( kind, variant );

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

  public static register ( mediaId: number, asset: MediaAssetInput ) : number {
    Media.assertMediaIdSafe( mediaId );

    const row = as< { id: number } | undefined >( conn().prepare( `
      INSERT INTO assets (
        media_id, kind, variant, path, fingerprint, mime_type,
        size_bytes, width, height, data_json
      )
      VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ? )
      ON CONFLICT ( media_id, kind, variant ) DO UPDATE SET
        path = excluded.path,
        fingerprint = excluded.fingerprint,
        mime_type = excluded.mime_type,
        size_bytes = excluded.size_bytes,
        width = excluded.width,
        height = excluded.height,
        data_json = excluded.data_json,
        created_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )
      RETURNING id
    ` ).get(
      mediaId, asset.kind, asset.variant ?? 'default',
      asset.path, asset.fingerprint ?? null, asset.mimeType ?? null,
      asset.sizeBytes ?? null, asset.width ?? null,
      asset.height ?? null, JSON.stringify( asset.data ?? {} )
    ) );

    if ( ! row ) throw new Error( `Could not register asset for media ${ mediaId }` );
    return row.id;
  }

  public static delete ( mediaId: number, kind: MediaAssetKind, variant = 'default' ) : void {
    Media.assertMediaIdSafe( mediaId );
    MediaAssets.assertKind( kind, variant );

    const result = conn().prepare(
      'DELETE FROM assets WHERE media_id = ? AND kind = ? AND variant = ?'
    ).run( mediaId, kind, variant.trim() );

    if ( Number( result.changes ) !== 1 )
      throw new Error( `Asset ${ kind }/${ variant } does not exist for media ${ mediaId }` );
  }
}
