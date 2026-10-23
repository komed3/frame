import { parseId, parsePagination } from '@/src/server/api/utils';
import { Markers } from '@/src/server/core/Markers';
import type { MarkerUpdate } from '@/src/shared/types/markers';
import type { RequestParamHandler } from 'express';
import { Router } from 'express';


export const markers = Router();
