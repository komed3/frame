import { parseId } from '@/src/server/api/utils';
import { MediaTaxonomy } from '@/src/server/media/Taxonomy';
import type { RequestParamHandler } from 'express';
import { Router } from 'express';


export const tags = Router();
export const categories = Router();
