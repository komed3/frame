import { Config } from '@/src/server/core/Config';
import { as, conn } from '@/src/server/core/Database';
import { Media } from '@/src/server/media/Media';
import { assertRelativePath } from '@/src/server/utils';
import type { MediaAssetInput, MediaAssetKind, MediaAssetRecord, MediaAssetRow } from '@/src/shared/types/assets';
import { randomUUID } from 'node:crypto';
import { mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';


export const ASSET_KINDS: MediaAssetKind[] = [ 'poster', 'thumb', 'frames', 'wave', 'text', 'subtitle' ];


export class MediaAssets {
  private static assertKind ( kind?: MediaAssetKind, variant = 'default' ) : void {
    if ( kind && ! ASSET_KINDS.includes( kind ) ) throw new Error( `Invalid asset kind: ${ kind }` );
    if ( typeof variant !== 'string' || ! variant.trim() ) throw new Error( 'Asset variant must not be empty' );
  }

  private static assertPathAvailable ( path: string, mediaId: number, kind: MediaAssetKind, variant: string ) : void {
    const row = as< { mediaId: number, kind: MediaAssetKind, variant: string } | undefined >(
      conn().prepare( 'SELECT media_id AS mediaId, kind, variant FROM assets WHERE path = ?' ).get( path )
    );

    if ( row && ( row.mediaId !== mediaId || row.kind !== kind || row.variant !== variant ) )
      throw new Error( `Asset path is already in use: ${ path }` );
  }

  private static mapRow ( row: MediaAssetRow ) : MediaAssetRecord {
    const data = JSON.parse( row.dataJson ) as unknown;

    if ( ! data || typeof data !== 'object' || Array.isArray( data ) )
      throw new Error( `Invalid asset data JSON for asset ${ row.id }` );

    return { ...row, data: data as Record< string, unknown > };
  }

  private static async moveIfExists ( path: string, target: string ) : Promise< boolean > {
    try {
      await rename( path, target );
      return true;
    } catch ( error ) {
      if ( ( error as NodeJS.ErrnoException ).code === 'ENOENT' ) return false;
      throw error;
    }
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
    MediaAssets.assertKind( asset.kind, asset.variant ?? 'default' );
    MediaAssets.resolvePath( asset.path );

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

  public static async write ( mediaId: number, asset: MediaAssetInput, content: Uint8Array ) : Promise< number > {
    Media.assertMediaIdSafe( mediaId );

    const variant = asset.variant === undefined ? 'default' : asset.variant.trim();
    MediaAssets.assertKind( asset.kind, variant );

    const input = { ...asset, variant };
    const path = MediaAssets.resolvePath( input.path );
    const previous = MediaAssets.get( mediaId, input.kind, variant );
    const previousPath = previous ? MediaAssets.resolvePath( previous.path ) : null;

    MediaAssets.assertPathAvailable( input.path, mediaId, input.kind, variant );
    await mkdir( dirname( path ), { recursive: true } );

    const tempPath = `${ path }.${ randomUUID() }.tmp`;
    const backupPath = `${ path }.${ randomUUID() }.bak`;
    let backedUp = false;

    try {
      await writeFile( tempPath, content, { flag: 'wx' } );
      backedUp = await MediaAssets.moveIfExists( path, backupPath );
      await rename( tempPath, path );
    } catch ( err ) {
      await rm( tempPath, { force: true } );
      if ( backedUp ) await rename( backupPath, path );
      throw err;
    }

    let id: number;

    try { id = MediaAssets.register( mediaId, { ...input, sizeBytes: content.byteLength } ) }
    catch ( err ) {
      await rm( path, { force: true } );
      if ( backedUp ) await rename( backupPath, path );
      throw err;
    }

    if ( backedUp ) await rm( backupPath, { force: true } );
    if ( previousPath && previousPath !== path ) await rm( previousPath, { force: true } );
    return id;
  }

  public static async update (
    mediaId: number, kind: MediaAssetKind, variant: string, content: Uint8Array,
    changes: Partial< Pick< MediaAssetInput, 'path' | 'fingerprint' | 'mimeType' | 'width' | 'height' | 'data' > > = {}
  ) : Promise< number > {
    const previous = MediaAssets.get( mediaId, kind, variant );
    if ( ! previous ) throw new Error( `Asset ${ kind }/${ variant } does not exist for media ${ mediaId }` );

    return MediaAssets.write( mediaId, {
      kind, variant, path: changes.path ?? previous.path,
      fingerprint: changes.fingerprint === undefined ? previous.fingerprint : changes.fingerprint,
      mimeType: changes.mimeType === undefined ? previous.mimeType : changes.mimeType,
      width: changes.width === undefined ? previous.width : changes.width,
      height: changes.height === undefined ? previous.height : changes.height,
      data: changes.data === undefined ? previous.data : changes.data
    }, content );
  }

  public static async delete ( mediaId: number, kind: MediaAssetKind, variant = 'default' ) : Promise< void > {
    Media.assertMediaIdSafe( mediaId );
    MediaAssets.assertKind( kind, variant );

    const asset = MediaAssets.get( mediaId, kind, variant );
    if ( ! asset ) throw new Error( `Asset ${ kind }/${ variant } does not exist for media ${ mediaId }` );

    const path = MediaAssets.resolvePath( asset.path );
    const backupPath = `${ path }.${ randomUUID() }.bak`;
    const backedUp = await MediaAssets.moveIfExists( path, backupPath );

    try {
      const result = conn().prepare(
        'DELETE FROM assets WHERE media_id = ? AND kind = ? AND variant = ?'
      ).run( mediaId, kind, variant.trim() );

      if ( Number( result.changes ) !== 1 )
        throw new Error( `Asset ${ kind }/${ variant } does not exist for media ${ mediaId }` );
    } catch ( error ) {
      if ( backedUp ) await rename( backupPath, path );
      throw error;
    }

    if ( backedUp ) await rm( backupPath, { force: true } );
  }

  public static async clean () : Promise< number > {
    const root = Config.get( 'ASSETS_PATH' );
    const reg = new Set( as< { path: string }[] >( conn().prepare( 'SELECT path FROM assets' ).all() ).map( a => a.path ) );
    let removed = 0;

    const cleanDirectory = async ( directory: string ) : Promise< void > => {
      let entries;

      try { entries = await readdir( directory, { withFileTypes: true } ) }
      catch ( err ) {
        if ( ( err as NodeJS.ErrnoException ).code === 'ENOENT' ) return;
        throw err;
      }

      for ( const entry of entries ) {
        const path = resolve( directory, entry.name );

        if ( entry.isDirectory() ) {
          await cleanDirectory( path );
          continue;
        }

        if ( ! entry.isFile() ) continue;

        const relativePath = relative( root, path ).split( sep ).join( '/' );
        if ( reg.has( relativePath ) ) continue;

        await rm( path );
        removed++;
      }
    };

    await cleanDirectory( root );
    return removed;
  }
}
