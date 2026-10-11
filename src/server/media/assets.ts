import { createHash } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import type { MediaAssetType, MediaAssetSource } from '@/src/shared/types';


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
}
