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
}
