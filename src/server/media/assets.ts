import { createHash } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import type { MediaAssetType, MediaAssetSource } from '@/src/shared/types';


export class AssetStorage {
  public readonly root: string;

  public constructor ( root = 'data/assets' ) {
    this.root = resolve( root );
  }
}
