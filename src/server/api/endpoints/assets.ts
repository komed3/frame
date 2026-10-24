import { assertMediaId } from '@/src/server/api/middleware';
import { MediaAssets } from '@/src/server/media/Assets';
import type { MediaAssetKind } from '@/src/shared/types/assets';
import { Router } from 'express';


export const assets = Router();
assets.param( 'id', assertMediaId );
