import { Config } from '@/src/server/core/Config';
import { as, conn } from '@/src/server/core/Database';
import { Media } from '@/src/server/media/Media';
import { assertRelativePath } from '@/src/server/utils';
import type { MediaAssetInput, MediaAssetKind, MediaAssetRecord, MediaAssetRow } from '@/src/shared/types/assets';
import { resolve } from 'node:path';


const ASSET_KINDS: MediaAssetKind[] = [ 'poster', 'thumb', 'frames', 'wave', 'text', 'subtitle' ];
