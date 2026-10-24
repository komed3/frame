import { MediaSearch } from '@/src/server/media/Search';
import { MediaSearchOptions } from '@/src/shared/types/search';
import { Router } from 'express';


export const search = Router();


search.get( '', ( req, res ) => res.json( MediaSearch.search( {
  ...req.body as MediaSearchOptions, userId: res.locals.user.id
} ) ) );
