import { assertMediaId } from '@/src/server/api/middleware';
import { Favorites } from '@/src/server/core/Favorites';
import { parsePagination } from '@/src/server/api/utils';
import { Router } from 'express';


export const favorites = Router();
favorites.param( 'mediaId', assertMediaId );
