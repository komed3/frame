import type { MediaAssetSource, MediaAssetType } from '@/src/shared/types';
import { createHash } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';


export class AssetStorage {
  private static readonly DIR: Record< MediaAssetType, string > = {
    poster: 'posters', thumb: 'thumbs', frames: 'frames', wave: 'waves', text: 'text'
  };

  public readonly root: string;

  public constructor ( root = 'data/assets' ) {
    this.root = resolve( root );
  }

  public fingerprint ( media: MediaAssetSource ) : string {
    return createHash( 'sha256' ).update( [
      media.id, media.content_hash ?? '', media.file_size, media.file_mtime_ms ?? ''
    ].join( '\0' ) ).digest( 'hex' ).slice( 0, 24 );
  }

  public relativePath ( type: MediaAssetType, mediaId: number, fingerprint: string, extension: string ) : string {
    return `${ AssetStorage.DIR[ type ] }/${ mediaId }-${ fingerprint }${ extension }`;
  }

  public absolutePath ( relativePath: string ) : string {
    const path = resolve( this.root, relativePath );
    const fromRoot = relative( this.root, path );

    if ( ! fromRoot || fromRoot === '..' || fromRoot.startsWith( `..${ sep }` ) || isAbsolute( fromRoot ) )
      throw new Error( `Invalid asset path: ${ relativePath }` );

    return path;
  }

  public async ensureParent ( path: string ) : Promise< void > {
    await mkdir( dirname( path ), { recursive: true } );
  }
}


export const assetStorage = new AssetStorage();
