import { assertMarkerId } from '@/src/server/api/middleware';
import { parsePagination } from '@/src/server/api/utils';
import { Markers } from '@/src/server/core/Markers';
import type { MarkerUpdate } from '@/src/shared/types/markers';
import { Router } from 'express';


export const markers = Router();
markers.param( 'id', assertMarkerId );
