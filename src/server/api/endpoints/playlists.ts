import { assertMediaId } from '@/src/server/api/middleware';
import { parseId, parsePagination } from '@/src/server/api/utils';
import { Playlists } from '@/src/server/core/Playlists';
import type { PlaylistUpdate } from '@/src/shared/types/playlists';
import type { RequestParamHandler } from 'express';
import { Router } from 'express';


export const playlists = Router();
