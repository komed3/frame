import { assertMediaId, assertPlaylistId } from '@/src/server/api/middleware';
import { parsePagination } from '@/src/server/api/utils';
import { Playlists } from '@/src/server/core/Playlists';
import type { PlaylistUpdate } from '@/src/shared/types/playlists';
import { Router } from 'express';


export const playlists = Router();
playlists.param( 'mediaId', assertMediaId );
playlists.param( 'id', assertPlaylistId );
