import { assertMediaId } from '@/src/server/api/middleware';
import { parsePagination } from '@/src/server/api/utils';
import { Markers } from '@/src/server/core/Markers';
import { Media } from '@/src/server/media/Media';
import { MediaMetadata } from '@/src/server/media/Metadata';
import { MediaSearch } from '@/src/server/media/Search';
import { MediaTaxonomy } from '@/src/server/media/Taxonomy';
import type { MediaSearchOptions } from '@/src/shared/types/search';
import { Router } from 'express';


export const media = Router();
media.param( 'id', assertMediaId );
