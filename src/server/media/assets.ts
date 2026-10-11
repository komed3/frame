import type { MediaAssetSource, MediaAssetType } from '@/src/shared/types';
import { createHash } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';


export class AssetStorage {
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
    const directory: Record< MediaAssetType, string > = {
      poster: 'posters', thumb: 'thumbs', frames: 'frames', wave: 'waves', text: 'text'
    };

    return `${ directory[ type ] }/${ mediaId }-${ fingerprint }${ extension }`;
  }

  public absolutePath ( relativePath: string ) : string {
    const path = resolve( this.root, relativePath );
    const fromRoot = path.slice( this.root.length );

    if ( fromRoot.startsWith( sep + '..' ) || path === this.root )
      throw new Error( `Invalid asset path: ${ relativePath }` );

    return path;
  }

  public async ensureParent ( path: string ) : Promise< void > {
    await mkdir( dirname( path ), { recursive: true } );
  }
}
