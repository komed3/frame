import { ASSET_KINDS, MediaAssets } from '@/src/server/media/Assets';
import type { MediaAssetKind } from '@/src/shared/types/assets';
import { Router, type NextFunction, type Response } from 'express';


export const assets = Router();
