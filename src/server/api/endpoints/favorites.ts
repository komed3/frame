import { assertMediaId } from '@/src/server/api/middleware';
import { parsePagination } from '@/src/server/api/utils';
import { Favorites } from '@/src/server/core/Favorites';
import { Router } from 'express';


export const favorites = Router();
favorites.param( 'mediaId', assertMediaId );
